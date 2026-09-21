#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const generated = p => /^(skills\/|preferences\/|plugins\/)/.test(p) || p === 'bundle.manifest.json';
const textExtensions = new Set('.md .txt .json .yaml .yml .toml .py .js .mjs .cjs .ts .tsx .html .css .svg .sh .ps1 .ipynb .sql .xml .ini .cfg .conf .rules .example .ql .csv .mdx .swift .jsonl .edl .lua .setting'.split(' '));
const skipDirs = new Set(['node_modules', '.git', '__pycache__', '.pytest_cache', '.cache', '.system']);
const sensitiveName = /^(?:\.env(?:\..*)?|\.npmrc|\.pypirc|auth\.json|credentials[^/]*|secrets?\.(?:json|ya?ml|txt)|tokens?\.(?:json|txt)|cookies\.json|settings\.json|config\.toml|id_rsa(?:\.pub)?|.*\.(?:pem|key|p12|pfx|jks|db|sqlite3?|dump|log))$/i;

export function safePath(root, relative) {
  if (!relative || relative.includes('\\') || relative.split('/').some(p => !p || p === '..' || p === '.') || path.isAbsolute(relative) || relative.includes(':')) throw new Error('Unsafe relative path');
  const result = path.resolve(root, relative);
  if (!result.startsWith(path.resolve(root) + path.sep)) throw new Error('Path escaped root');
  let current = path.resolve(root);
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink refused: ${relative}`);
  }
  return result;
}

export function walk(root, prefix = '') {
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error('Source root is a link');
  const found = [];
  for (const entry of fs.readdirSync(root, {withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name))) {
    if (skipDirs.has(entry.name)) continue;
    const relative = prefix + entry.name;
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Link refused: ${relative}`);
    if (sensitiveName.test(entry.name) || (entry.name.startsWith('.') && !['.codex-plugin','.gitignore'].includes(entry.name))) throw new Error(`Private source path refused: ${relative}`);
    if (entry.isDirectory()) found.push(...walk(full, relative + '/'));
    else if (entry.isFile()) found.push(relative);
  }
  return found;
}

export function scan(data, label, denied = []) {
  const content = data.toString('utf8');
  const rules = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
    ['provider credential', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}\b/],
    ['AWS credential', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['Slack credential', /\bxox[baprs]-[A-Za-z0-9-]{24,}\b/],
    ['authenticated URL', /https?:\/\/[^\s/:]+:[^\s/@]+@/],
    ['npm credential', /\bnpm_[A-Za-z0-9]{36}\b/],
    ['Google credential', /\bAIza[A-Za-z0-9_-]{35}\b/],
    ['service credential', /\b(?:lin_api_|ntn_|pypi-)[A-Za-z0-9_-]{30,}\b/],
  ];
  const exceptionPath = path.join(ROOT, 'scan-exceptions.json');
  const exceptions = fs.existsSync(exceptionPath) ? JSON.parse(fs.readFileSync(exceptionPath, 'utf8')) : [];
  for (const [kind, pattern] of rules) if (pattern.test(content) && !exceptions.some(e => e.path === label && e.rule === kind && e.sha256 === digest(data))) throw new Error(`Publication blocked: ${kind} in ${label}`);
  for (const term of denied) if (term && content.toLowerCase().includes(term.toLowerCase())) throw new Error(`Publication blocked: private-content rule in ${label}`);
}

function textFile(relative) {
  return textExtensions.has(path.extname(relative).toLowerCase()) || /(?:^|\/)(?:LICENSE[^/]*|NOTICE[^/]*|VERSION|\.gitignore|Dockerfile|Makefile|pre-commit|pre-push|commit-msg)$/.test(relative);
}

export function sanitize(text, config) {
  for (const [from, to] of config.replacements || []) text = text.split(from).join(to);
  // Private migration evidence is deliberately absent from the public source notes.
  text = text.replace(/^.*\{\{HOME\}\}\/code\/[^\r\n]*\r?\n/gm, '');
  text = text.replace(/For the (?:private )?local review[^\n]*\n/g, '');
  return text;
}

export function projectPreferences(source, config, preamble) {
  const sections = source.replace(/\r\n/g,'\n').split(/(?=^## )/m);
  const selected = [];
  for (const heading of config.preferenceSections) {
    let body = sections.find(s => s.startsWith(`## ${heading}\n`));
    if (!body) throw new Error(`Missing approved preference section: ${heading}`);
    if (config.sectionEndMarkers?.[heading]) body = body.split(config.sectionEndMarkers[heading])[0] + '\n';
    selected.push(sanitize(body.trim(), config));
  }
  return Buffer.from(preamble.trim() + '\n\n' + selected.join('\n\n') + '\n');
}

export function build(config, root = ROOT) {
  const files = new Map();
  const add = (relative, input, sourceLabel) => {
    safePath(root, relative);
    let data = input;
    scan(input, relative); // Credential checks also run before transformations.
    if (textFile(relative)) data = Buffer.from(sanitize(input.toString('utf8'), config));
    else if (config.approvedBinaryHashes?.[sourceLabel] !== digest(data)) throw new Error(`Unreviewed binary: ${relative}`);
    if (relative === 'skills/obsidian/SKILL.md') data = Buffer.from(data.toString('utf8').replace(/^Read \[references\/index-snapshot\.md\].*$/m, 'Read [references/index-snapshot.md](references/index-snapshot.md) for the public bundle navigation boundary. No private index snapshot is included. Inspect the live vault Home.md and relevant Index.md files before making changes.'));
    if (relative.startsWith('skills/') && textFile(relative)) data = Buffer.from(data.toString('utf8').replaceAll('$CODEX_HOME/skills', '{{SKILLS}}').replaceAll('~/.codex/skills', '{{SKILLS}}').replace(/^export CODEX_HOME=.*\r?\n/gm, ''));
    scan(data, relative, config.deniedTerms);
    if (files.has(relative) && !files.get(relative).equals(data)) throw new Error(`Conflicting sources: ${relative}`);
    files.set(relative, data);
  };
  const names = new Set();
  for (const source of config.skillSources) {
    const actual = fs.readdirSync(source.path, {withFileTypes:true}).filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);
    const unknown = actual.filter(n => !source.names.includes(n));
    if (unknown.length) throw new Error(`New skills need public-export review: ${unknown.join(', ')}`);
    for (const name of source.names) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error('Invalid skill name');
      const dir = safePath(source.path, name);
      if (!fs.existsSync(path.join(dir,'SKILL.md'))) throw new Error(`Missing skill entrypoint: ${name}`);
      for (const relative of walk(dir)) {
        if (/(?:^|\/)(?:\.env(?:\..*)?|auth\.json|credentials[^/]*|settings\.json|config\.toml|.*\.(?:pem|key|db|sqlite|log))$/i.test(relative)) throw new Error(`Excluded private filename in ${name}`);
        const target = `skills/${name}/${relative}`;
        const override = config.overrides?.[target];
        const input = fs.readFileSync(override ? safePath(root, override) : path.join(dir,relative));
        add(target, input, `${name}/${relative}`);
      }
      names.add(name);
    }
  }
  if (config.pluginRoot) {
    const provenance = JSON.parse(fs.readFileSync(path.join(config.pluginRoot, 'SOURCE.json'), 'utf8'));
    for (const entry of provenance.files) {
      if (digest(fs.readFileSync(safePath(config.pluginRoot, entry.path))) !== entry.sha256) throw new Error(`ECC upstream provenance drift: ${entry.path}`);
    }
    for (const relative of walk(config.pluginRoot)) {
      if (!/^(?:\.codex-plugin\/|hooks\/|library\/|references\/|scripts\/|skills\/|tests\/|vendor\/|LICENSE-ECC\.txt$|package(?:-lock)?\.json$|SOURCE\.json$|RUNBOOK\.md$)/.test(relative)) throw new Error(`Unexpected plugin source: ${relative}`);
      if (relative.startsWith('.')) {
        if (!relative.startsWith('.codex-plugin/')) continue;
      }
      const target = 'plugins/ecc-workbench/' + relative;
      const override = config.overrides?.[target];
      add(target, fs.readFileSync(override ? safePath(root,override) : path.join(config.pluginRoot,relative)), 'ecc/' + relative);
    }
  }
  const prefs = projectPreferences(fs.readFileSync(config.preferencesFile,'utf8'), config, fs.readFileSync(path.join(root,'templates/preamble.md'),'utf8'));
  add('preferences/AGENTS.md', prefs, 'preferences');
  const ordered = [...files].sort(([a],[b]) => a.localeCompare(b));
  const manifest = {schema:1, skills:[...names].sort(), files:Object.fromEntries(ordered.map(([p,b]) => [p,digest(b)]))};
  files.set('bundle.manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
  return files;
}

export function verify(root = ROOT, denied = []) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'bundle.manifest.json'),'utf8'));
  if (manifest.schema !== 1 || !manifest.files) throw new Error('Invalid bundle manifest');
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (!generated(relative) || relative === 'bundle.manifest.json') throw new Error('Unexpected bundle entry');
    const data = fs.readFileSync(safePath(root,relative));
    if (digest(data) !== expected) throw new Error(`Digest mismatch: ${relative}`);
    scan(data, relative, denied);
  }
  for (const dir of ['skills','preferences','plugins']) if (fs.existsSync(path.join(root,dir))) {
    for (const relative of walk(path.join(root,dir),dir+'/')) if (!(relative in manifest.files)) throw new Error(`Unmanifested file: ${relative}`);
  }
  for (const name of manifest.skills) {
    const skill = fs.readFileSync(safePath(root,`skills/${name}/SKILL.md`),'utf8');
    if (!/^---\r?\n[\s\S]+?\r?\n---/.test(skill) || !/^name:\s*\S+/m.test(skill) || !/^description:\s*\S+/m.test(skill)) throw new Error(`Invalid skill frontmatter: ${name}`);
  }
  return {skills:manifest.skills.length, files:Object.keys(manifest.files).length};
}

function git(root, args) {
  return execFileSync('git', ['-c',`safe.directory=${root.replaceAll('\\','/')}`, ...args], {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}).trim();
}

export function writeBundle(files, root = ROOT) {
  const manifestPath = path.join(root,'bundle.manifest.json');
  const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath,'utf8')).files : {};
  // Validate ALL ownership and source drift before the first mutation.
  for (const [relative, expected] of Object.entries(old)) {
    const dest = safePath(root,relative);
    if (!fs.existsSync(dest) || digest(fs.readFileSync(dest)) !== expected) throw new Error(`Generated output edited locally: ${relative}`);
  }
  for (const [relative] of files) {
    const dest = safePath(root,relative);
    if (fs.existsSync(dest) && relative !== 'bundle.manifest.json' && !old[relative]) throw new Error(`Unowned output exists: ${relative}`);
  }
  let changed = 0;
  const backups = new Map();
  const temporaries = [];
  try {
  for (const [relative,data] of files) {
    const dest = safePath(root,relative);
    if (fs.existsSync(dest) && fs.readFileSync(dest).equals(data)) continue;
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    const temporary = dest + '.toolkit-tmp';
    backups.set(dest,fs.existsSync(dest) ? fs.readFileSync(dest) : null);
    temporaries.push(temporary);
    fs.writeFileSync(temporary,data,{flag:'wx'});
    fs.renameSync(temporary,dest);
    changed++;
  }
  for (const relative of Object.keys(old)) if (!files.has(relative)) {
    const dest = safePath(root,relative); backups.set(dest,fs.readFileSync(dest)); fs.unlinkSync(dest); changed++;
  }
  } catch (error) {
    for (const [dest,data] of [...backups].reverse()) {
      if (data === null) {if(fs.existsSync(dest)) fs.unlinkSync(dest);}
      else fs.writeFileSync(dest,data);
    }
    throw error;
  } finally {for(const temporary of temporaries) if(fs.existsSync(temporary)) fs.unlinkSync(temporary);}
  return changed;
}

function reviewBundle(files, root) {
  const preview = path.join(root,'.local/preview');
  fs.mkdirSync(preview,{recursive:true});
  const old = fs.existsSync(path.join(root,'bundle.manifest.json')) ? JSON.parse(fs.readFileSync(path.join(root,'bundle.manifest.json'),'utf8')).files : {};
  const changes = [];
  for (const relative of new Set([...files.keys(), ...Object.keys(old)])) {
    const dest = safePath(root,relative);
    const before = fs.existsSync(dest) ? fs.readFileSync(dest) : Buffer.alloc(0);
    const after = files.get(relative) || Buffer.alloc(0);
    if (before.equals(after)) continue;
    const beforePath = path.join(preview,'before'); const afterPath = path.join(preview,'after');
    fs.writeFileSync(beforePath,before); fs.writeFileSync(afterPath,after);
    let diff;
    try {diff = execFileSync('git',['diff','--no-index','--no-ext-diff','--',beforePath,afterPath],{encoding:'utf8',maxBuffer:20*1024*1024});}
    catch(e) {if(e.status !== 1) throw e; diff=e.stdout;}
    changes.push(`## ${relative}\n\n${diff}`);
  }
  const fingerprint = digest(files.get('bundle.manifest.json'));
  fs.writeFileSync(path.join(root,'.local/review.md'), changes.join('\n') || 'No public bundle changes.\n');
  return {status:'review',changes:changes.length,fingerprint,report:'.local/review.md'};
}

export function run(args, root = ROOT) {
  const reviewedAt = args.indexOf('--reviewed');
  const reviewed = reviewedAt >= 0 ? args[reviewedAt+1] : null;
  if (reviewedAt >= 0 && !/^[a-f0-9]{64}$/.test(reviewed || '')) throw new Error('--reviewed needs the preview fingerprint');
  const flags = args.filter((_,i) => i !== reviewedAt && i !== reviewedAt+1 || reviewedAt < 0);
  if (flags.some(a => !['--verify','--publish','--dry-run','--review'].includes(a))) throw new Error('Usage: sync.mjs [--verify | --publish [--reviewed HASH] | --dry-run | --review]');
  const configPath = path.join(root,'.local/sources.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath,'utf8')) : null;
  if (args.includes('--verify')) return verify(root,config?.deniedTerms || []);
  if (!config) throw new Error('Publisher not configured: see docs/SYNC.md');
  const publish = args.includes('--publish');
  const lock = path.join(root,'.local/sync.lock');
  const handle = fs.openSync(lock,'wx');
  try {
    fs.writeFileSync(handle, JSON.stringify({pid:process.pid,started:new Date().toISOString()}));
    if (publish) {
      if (git(root,['branch','--show-current']) !== 'main') throw new Error('Publishing requires main');
      if (git(root,['remote','get-url','origin']) !== config.remote) throw new Error('Unexpected publishing remote');
      if (git(root,['status','--porcelain'])) throw new Error('Publisher checkout is dirty; commit/review changes first');
      git(root,['fetch','origin','main']);
      const ahead = git(root,['rev-list','--left-right','--count','origin/main...HEAD']).split(/\s+/).map(Number);
      if (ahead[0]) throw new Error('Remote has newer commits; review and fast-forward before publishing');
      if (ahead[1]) {
        const commits = git(root,['rev-list','origin/main..HEAD']).split('\n');
        for (const commit of commits) {
          if (git(root,['rev-list','--parents','-n','1',commit]).split(/\s+/).length !== 2) throw new Error('Pending merge/root commit requires manual review');
          if (git(root,['show','-s','--format=%s',commit]) !== 'chore: sync public agent bundle') throw new Error('Unreviewed local commits pending');
          if (git(root,['diff-tree','--no-commit-id','--name-only','-r',commit]).split('\n').some(p => !generated(p))) throw new Error('Pending commit includes non-bundle files');
          for (const relative of git(root,['ls-tree','-r','--name-only',commit]).split('\n')) scan(Buffer.from(git(root,['show',`${commit}:${relative}`])), relative, config.deniedTerms);
        }
        // Retry the previous validated publication before creating another commit.
        verify(root,config.deniedTerms);
        git(root,['push','origin','HEAD:main']);
      }
    }
    const files = build(config,root);
    if (args.includes('--review')) return reviewBundle(files,root);
    if (args.includes('--dry-run')) return {status:'preview',files:files.size,skills:JSON.parse(files.get('bundle.manifest.json')).skills.length};
    if (publish && config.requireReview && reviewed !== digest(files.get('bundle.manifest.json'))) throw new Error('Publication requires the exact reviewed preview fingerprint');
    const changed = writeBundle(files,root);
    const verified = verify(root,config.deniedTerms);
    if (publish && changed) {
      for (const relative of git(root,['ls-files','--cached','--others','--exclude-standard']).split('\n')) scan(fs.readFileSync(safePath(root,relative)),relative,config.deniedTerms);
      git(root,['add','--','skills','preferences','plugins','bundle.manifest.json']);
      git(root,['commit','-m','chore: sync public agent bundle']);
      git(root,['push','origin','HEAD:main']);
    }
    const result = {status:changed ? (publish ? 'published' : 'exported') : 'unchanged',changed,...verified};
    fs.writeFileSync(path.join(root,'.local/last-sync.json'),JSON.stringify({...result,at:new Date().toISOString()},null,2)+'\n');
    return result;
  } finally { fs.closeSync(handle); fs.unlinkSync(lock); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)),null,2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
