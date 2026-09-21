import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.resolve(HERE, '..');
const START = '<!-- agent-toolkit:start -->';
const END = '<!-- agent-toolkit:end -->';
const TARGETS = new Set(['codex', 'claude', 'generic', 'gemini', 'opencode']);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const abs = (p) => path.resolve(p);
const inside = (root, candidate) => {
  const r = abs(root); const c = abs(candidate);
  return c === r || c.startsWith(r + path.sep);
};
const bytes = (text) => Buffer.from(text, 'utf8');

async function lstatNoLink(file) {
  const s = await fs.lstat(file);
  if (s.isSymbolicLink()) throw new Error(`symlink is not allowed: ${file}`);
  return s;
}

export async function assertSafeSource(root, relative) {
  const normalized = String(relative ?? '');
  if (!normalized || normalized !== normalized.replaceAll('\\', '/') || path.isAbsolute(normalized) || normalized.includes(':') || normalized.split('/').some((p) => !p || p === '..' || p === '.')) {
    throw new Error(`unsafe bundle path: ${relative}`);
  }
  const full = abs(path.join(root, relative));
  if (!inside(root, full)) throw new Error(`bundle path escapes root: ${relative}`);
  const parts = path.relative(abs(root), full).split(path.sep);
  let current = abs(root);
  for (const part of parts) { current = path.join(current, part); await lstatNoLink(current); }
  return full;
}

async function assertSafeDestination(file, home) {
  if (!inside(home, file)) throw new Error(`destination escapes home: ${file}`);
  const rel = path.relative(abs(home), abs(file));
  let current = abs(home);
  for (const part of rel.split(path.sep).slice(0, -1)) {
    current = path.join(current, part);
    try { await lstatNoLink(current); } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
  }
  try { await lstatNoLink(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

async function assertSafeRoot(root) {
  const parsed = path.parse(abs(root)); let current = parsed.root;
  for (const part of path.relative(parsed.root, abs(root)).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { await lstatNoLink(current); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

function managedRoots(home) { return { dirs: [path.join(home, '.agents', 'skills'), path.join(home, '.claude', 'skills'), path.join(home, '.gemini', 'skills'), path.join(home, '.config', 'opencode', 'skills'), path.join(home, '.agent-toolkit', 'skills'), path.join(home, '.agent-toolkit', 'plugins', 'ecc-workbench')], files: [path.join(home, '.codex', 'AGENTS.md'), path.join(home, '.claude', 'CLAUDE.md'), path.join(home, '.gemini', 'GEMINI.md'), path.join(home, '.config', 'opencode', 'AGENTS.md'), path.join(home, '.agent-toolkit', 'AGENTS.md')] }; }
function isManagedPath(home, file) { const roots = managedRoots(home); return roots.files.some((r) => abs(r) === abs(file)) || roots.dirs.some((r) => inside(r, file)); }
async function validateReceipt(receipt, home) {
  if (receipt.schema !== 1 || !receipt.files || typeof receipt.files !== 'object') throw new Error('invalid install-state.json');
  for (const [file, entry] of Object.entries(receipt.files)) {
    if (!path.isAbsolute(file) || !inside(home, file) || !isManagedPath(home, file) || !entry || !/^[a-f0-9]{64}$/i.test(entry.installedHash) || (entry.kind !== 'file' && entry.kind !== 'instruction')) throw new Error(`unsafe install receipt entry: ${file}`);
    await assertSafeDestination(file, home);
    if (entry.backup && (entry.backup.path !== file || typeof entry.backup.bytes !== 'string')) throw new Error(`invalid backup receipt entry: ${file}`);
  }
}

async function readManifest(root) {
  await assertSafeRoot(root);
  const manifestPath = await assertSafeSource(root, 'bundle.manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.schema !== 1 || !manifest.files || typeof manifest.files !== 'object') {
    throw new Error('bundle.manifest.json must have schema=1 and a files map');
  }
  const files = [];
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (!/^(skills\/|preferences\/AGENTS\.md$|plugins\/ecc-workbench\/)/.test(relative.replaceAll('\\', '/'))) {
      throw new Error(`manifest entry is outside the portable bundle allowlist: ${relative}`);
    }
    if (!/^[a-f0-9]{64}$/i.test(expected)) throw new Error(`invalid hash for ${relative}`);
    const full = await assertSafeSource(root, relative);
    const actual = sha256(await fs.readFile(full));
    if (actual.toLowerCase() !== expected.toLowerCase()) throw new Error(`manifest hash mismatch: ${relative}`);
    files.push({ relative: relative.replaceAll('\\', '/'), full, hash: actual });
  }
  if (!files.some((f) => f.relative === 'preferences/AGENTS.md')) throw new Error('manifest must include preferences/AGENTS.md');
  return { manifest, files };
}

function replaceTemplate(text, values) {
  return text.replaceAll('{{HOME}}', values.home.replaceAll('\\', '/'))
    .replaceAll('{{VAULT}}', values.vault.replaceAll('\\', '/'))
    .replaceAll('{{TOOLKIT}}', values.toolkit.replaceAll('\\', '/'))
    .replaceAll('{{SKILLS}}', values.skills.replaceAll('\\', '/'));
}

async function readTextOrBytes(file) {
  const b = await fs.readFile(file);
  const text = b.toString('utf8');
  return { data: b, text: Buffer.from(text, 'utf8').equals(b) ? text : null };
}

function targetLayout(target, home) {
  if (target === 'codex') return { skills: path.join(home, '.agents', 'skills'), instructions: path.join(home, '.codex', 'AGENTS.md') };
  if (target === 'claude') return { skills: path.join(home, '.claude', 'skills'), instructions: path.join(home, '.claude', 'CLAUDE.md') };
  if (target === 'gemini') return { skills: path.join(home, '.gemini', 'skills'), instructions: path.join(home, '.gemini', 'GEMINI.md') };
  if (target === 'opencode') return { skills: path.join(home, '.config', 'opencode', 'skills'), instructions: path.join(home, '.config', 'opencode', 'AGENTS.md') };
  return { skills: path.join(home, '.agent-toolkit', 'skills'), instructions: path.join(home, '.agent-toolkit', 'AGENTS.md') };
}

function parseArgs(argv) {
  const o = { targets: ['codex', 'claude', 'generic'], apply: false, uninstall: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--uninstall') o.uninstall = true;
    else if (a === '--targets') o.targets = argv[++i]?.split(',').filter(Boolean);
    else if (a === '--home') o.home = argv[++i];
    else if (a === '--vault') o.vault = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!o.targets?.length || o.targets.some((t) => !TARGETS.has(t))) throw new Error('targets must be codex, claude, generic, gemini, or opencode');
  return o;
}

function block(content) { return `${START}\n${content.trimEnd()}\n${END}`; }
function getBlock(text) { const s = text.indexOf(START); const e = text.indexOf(END); return s >= 0 && e >= s ? text.slice(s, e + END.length) : null; }
function mergeInstruction(existing, managed) {
  const old = getBlock(existing);
  if (!old) return `${existing.trimEnd()}\n\n${managed}\n`;
  return existing.slice(0, existing.indexOf(START)) + managed + existing.slice(existing.indexOf(END) + END.length);
}

async function destinationPlan({ root, home, vault, targets }) {
  const { files } = await readManifest(root);
  const toolkit = path.join(home, '.agent-toolkit');
  const pluginFiles = files.filter((f) => f.relative.startsWith('plugins/ecc-workbench/'));
  const skillFiles = files.filter((f) => f.relative.startsWith('skills/'));
  const pref = files.find((f) => f.relative === 'preferences/AGENTS.md');
  const planned = [];
  for (const target of targets) {
    const layout = targetLayout(target, home);
    const vals = { home: abs(home), vault: abs(vault), toolkit: abs(toolkit), skills: abs(layout.skills) };
    for (const f of skillFiles) {
      const raw = await readTextOrBytes(f.full);
      planned.push({ source: f, generated: raw.text === null ? raw.data : Buffer.from(replaceTemplate(raw.text, vals)), dest: path.join(layout.skills, f.relative.slice('skills/'.length)), kind: 'file' });
    }
    for (const name of ['ecc-library', 'ecc-operations']) {
      const rel = name === 'ecc-library' ? 'skills/library/SKILL.md' : 'skills/operations/SKILL.md';
      const description = name === 'ecc-library' ? 'Retrieve on-demand methods for substantial engineering, research, stack-specific implementation and agent operations.' : 'Coordinate project-local work items and checkpoints for multi-session or multi-owner engineering tasks.';
      if (pluginFiles.length) planned.push({ generated: Buffer.from(`---\nname: ${name}\ndescription: ${description}\n---\n\nRead the canonical ECC skill at \`${path.join(toolkit, 'plugins', 'ecc-workbench', rel).replaceAll('\\', '/')}\`.\nResolve its relative support paths from that original directory.\n`), dest: path.join(layout.skills, name, 'SKILL.md'), kind: 'file' });
    }
    const source = (await readTextOrBytes(pref.full)).text;
    planned.push({ generated: Buffer.from(block(replaceTemplate(source, vals))), dest: layout.instructions, kind: 'instruction' });
  }
  const pluginVals = { home: abs(home), vault: abs(vault), toolkit: abs(toolkit), skills: abs(path.join(home, '.agent-toolkit', 'skills')) };
  for (const f of pluginFiles) {
    const raw = await readTextOrBytes(f.full);
    planned.push({ source: f, generated: raw.text === null ? raw.data : Buffer.from(replaceTemplate(raw.text, pluginVals)), dest: path.join(toolkit, 'plugins', 'ecc-workbench', f.relative.slice('plugins/ecc-workbench/'.length)), kind: 'file' });
  }
  return { files, planned, toolkit, vault: abs(vault) };
}

async function preflight(planned, home, previous) {
  const seen = new Map();
  for (const p of planned) {
    const d = abs(p.dest); await assertSafeDestination(d, home);
    if (seen.has(d) && !seen.get(d).equals(p.generated ?? await fs.readFile(p.source.full))) throw new Error(`conflicting planned destination: ${d}`);
    seen.set(d, p.generated ?? await fs.readFile(p.source.full));
  }
  for (const p of planned) {
    try {
      const current = await fs.readFile(p.dest);
      const prior = previous.files?.[abs(p.dest)];
      if (p.kind === 'file' && !current.equals(seen.get(abs(p.dest))) && (!prior || sha256(current) !== prior.installedHash)) throw new Error(`destination conflict (existing unmanaged file): ${p.dest}`);
      if (p.kind === 'instruction') {
        const old = getBlock(current.toString('utf8'));
        const expectedOld = prior?.block;
        if (old && old !== seen.get(abs(p.dest)).toString('utf8') && old !== expectedOld) throw new Error(`managed instruction block was edited: ${p.dest}`);
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

export async function installBundle(options = {}) {
  const root = abs(options.root ?? DEFAULT_ROOT); const home = abs(options.home ?? process.env.USERPROFILE ?? process.env.HOME ?? '.');
  const vault = abs(options.vault ?? path.join(home, '.agent-toolkit', 'knowledge')); const targets = options.targets ?? ['codex', 'claude', 'generic'];
  if (!targets.length) throw new Error('at least one target is required');
  for (const t of targets) if (!TARGETS.has(t)) throw new Error(`unknown target: ${t}`);
  await assertSafeRoot(home);
  const plan = await destinationPlan({ root, home, vault, targets });
  const receiptPath = path.join(plan.toolkit, 'install-state.json');
  await assertSafeDestination(receiptPath, home);
  let previous = { schema: 1, files: {} };
  try { previous = JSON.parse(await fs.readFile(receiptPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await validateReceipt(previous, home);
  await preflight(plan.planned, home, previous);
  const plannedPaths = new Set(plan.planned.map((p) => abs(p.dest)));
  const selectedRoots = targets.flatMap((t) => { const l = targetLayout(t, home); return [l.skills, l.instructions]; }).concat([path.join(home, '.agent-toolkit', 'plugins', 'ecc-workbench')]);
  const stale = [];
  for (const [file, entry] of Object.entries(previous.files)) {
    if (plannedPaths.has(abs(file)) || !selectedRoots.some((r) => inside(r, file))) continue;
    const current = await fs.readFile(file).catch((e) => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (!current) { delete previous.files[file]; continue; }
    if (sha256(current) !== entry.installedHash) throw new Error(`destination drift prevents stale removal: ${file}`);
    stale.push(entry.backup ? { file, data: Buffer.from(entry.backup.bytes, 'base64') } : { file, remove: true });
    delete previous.files[file];
  }
  const receipt = { ...previous, schema: 1, files: { ...previous.files }, installedAt: new Date().toISOString() };
  const results = [];
  for (const p of plan.planned) {
    const rendered = p.generated ?? (await readTextOrBytes(p.source.full)).data;
    const existing = await fs.readFile(p.dest).catch((e) => e.code === 'ENOENT' ? null : Promise.reject(e));
    let output = rendered;
    if (p.kind === 'instruction') output = Buffer.from(mergeInstruction(existing?.toString('utf8') ?? '', rendered.toString('utf8')));
    const installedHash = sha256(output);
    const oldReceipt = previous.files[abs(p.dest)];
    receipt.files[abs(p.dest)] = { installedHash, kind: p.kind, block: p.kind === 'instruction' ? rendered.toString('utf8') : undefined, backup: oldReceipt ? oldReceipt.backup : (existing ? { path: abs(p.dest), bytes: existing.toString('base64') } : null) };
    results.push({ path: abs(p.dest), action: existing ? 'update' : 'install', hash: installedHash });
    if (options.apply) { await fs.mkdir(path.dirname(p.dest), { recursive: true }); await fs.writeFile(p.dest, output); }
  }
  if (options.apply) {
    for (const op of stale) { if (op.remove) await fs.unlink(op.file); else await fs.writeFile(op.file, op.data); }
    await fs.mkdir(plan.toolkit, { recursive: true }); await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  }
  return { mode: options.apply ? 'applied' : 'dry-run', results, receiptPath };
}

export async function uninstallBundle(options = {}) {
  const home = abs(options.home ?? process.env.USERPROFILE ?? process.env.HOME ?? '.'); const toolkit = path.join(home, '.agent-toolkit'); const receiptPath = path.join(toolkit, 'install-state.json');
  await assertSafeRoot(home); await assertSafeDestination(receiptPath, home);
  const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
  await validateReceipt(receipt, home);
  const results = []; const remaining = {}; const operations = [];
  for (const [file, entry] of Object.entries(receipt.files ?? {})) {
    const current = await fs.readFile(file).catch((e) => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (!current) { results.push({ path: file, action: 'missing' }); remaining[file] = entry; continue; }
    if (entry.kind === 'instruction') {
      const text = current.toString('utf8'); const old = getBlock(text);
      if (old === entry.block) {
        const next = text.replace(old, '').replace(/\n{3,}/g, '\n\n'); results.push({ path: file, action: entry.backup && sha256(current) === entry.installedHash ? 'restore' : 'remove-managed-block' });
        operations.push({ file, data: entry.backup && sha256(current) === entry.installedHash ? Buffer.from(entry.backup.bytes, 'base64') : Buffer.from(next) });
      }
      else { results.push({ path: file, action: 'preserve-edited-instruction' }); remaining[file] = entry; }
    } else if (sha256(current) === entry.installedHash) {
      results.push({ path: file, action: entry.backup ? 'restore' : 'remove' });
      operations.push(entry.backup ? { file, data: Buffer.from(entry.backup.bytes, 'base64') } : { file, remove: true });
    } else { results.push({ path: file, action: 'preserve-drift' }); remaining[file] = entry; }
  }
  if (options.apply) { for (const op of operations) { if (op.remove) await fs.unlink(op.file); else await fs.writeFile(op.file, op.data); } const next = { ...receipt, files: remaining, uninstalledAt: new Date().toISOString() }; await fs.writeFile(receiptPath, JSON.stringify(next, null, 2) + '\n'); }
  return { mode: options.apply ? 'applied' : 'dry-run', results, receiptPath };
}

export { parseArgs, readManifest, replaceTemplate, getBlock, mergeInstruction };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const args = parseArgs(process.argv.slice(2)); const result = args.uninstall ? await uninstallBundle({ ...args, apply: args.apply }) : await installBundle(args); const counts = result.results.reduce((a, r) => { a[r.action] = (a[r.action] ?? 0) + 1; return a; }, {}); console.log(JSON.stringify({ mode: result.mode, receiptPath: result.receiptPath, counts }, null, 2)); }
  catch (error) { console.error(`install failed: ${error.message}`); process.exitCode = 1; }
}
