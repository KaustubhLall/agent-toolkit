import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, digest, projectPreferences, run, safePath, scan, verify, writeBundle } from '../tools/sync.mjs';

let tmp;

const read = (p) => fs.readFile(p, 'utf8');
const exists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const git = (cwd, args, options = {}) => execFileSync('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, ...args], { cwd, encoding: 'utf8', ...options }).trim();

async function fixture({ sourceText = '---\nname: demo\ndescription: A demo skill\n---\nUse the generic workflow.\n', deniedTerms = [], replacements = [], overrides = {}, names = ['demo'], pluginRoot } = {}) {
  const root = path.join(tmp, 'bundle');
  const source = path.join(tmp, 'source', 'skills');
  const skill = path.join(source, 'demo');
  const preferences = path.join(tmp, 'preferences.md');
  await fs.mkdir(skill, { recursive: true });
  await fs.mkdir(path.join(root, 'templates'), { recursive: true });
  await fs.mkdir(path.join(root, '.local'), { recursive: true });
  await fs.writeFile(path.join(root, '.gitignore'), '.local/\n');
  await fs.writeFile(path.join(skill, 'SKILL.md'), sourceText);
  await fs.writeFile(path.join(root, 'templates', 'preamble.md'), 'Portable preferences.\n');
  await fs.writeFile(preferences, '# Preferences\n\n## Working modes\nUse bounded work.\n');
  for (const [relative, content] of Object.entries(overrides)) {
    const full = path.join(root, relative);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
  const config = {
    skillSources: [{ path: source, names }],
    preferencesFile: preferences,
    preferenceSections: ['Working modes'],
    deniedTerms,
    replacements,
    overrides,
  };
  if (pluginRoot) config.pluginRoot = pluginRoot;
  await fs.writeFile(path.join(root, '.local', 'sources.json'), JSON.stringify(config, null, 2));
  return { root, source, skill, preferences, config };
}

beforeEach(async () => { tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agent-toolkit-sync-'))); });
afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

test('build is deterministic, exports, verifies, and is idempotent', async () => {
  const { root } = await fixture();
  const first = build(JSON.parse(await read(path.join(root, '.local', 'sources.json'))), root);
  const second = build(JSON.parse(await read(path.join(root, '.local', 'sources.json'))), root);
  assert.deepEqual([...first.entries()].map(([p, b]) => [p, digest(b)]), [...second.entries()].map(([p, b]) => [p, digest(b)]));
  assert.equal(writeBundle(first, root) > 0, true);
  assert.deepEqual(verify(root), { skills: 1, files: 2 });
  assert.equal(writeBundle(build(JSON.parse(await read(path.join(root, '.local', 'sources.json'))), root), root), 0);
});

test('verify rejects an unsupported manifest schema', async () => {
  const { root } = await fixture();
  const config = JSON.parse(await read(path.join(root, '.local', 'sources.json')));
  writeBundle(build(config, root), root);
  const manifestPath = path.join(root, 'bundle.manifest.json');
  const manifest = JSON.parse(await read(manifestPath));
  manifest.schema = 2;
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  assert.throws(() => verify(root), /Invalid bundle manifest/);
});

test('generated drift is refused before any new output is written', async () => {
  const { root } = await fixture();
  const config = JSON.parse(await read(path.join(root, '.local', 'sources.json')));
  writeBundle(build(config, root), root);
  await fs.writeFile(path.join(root, 'skills', 'demo', 'SKILL.md'), 'local edit');
  const newOutput = path.join(root, 'preferences', 'new.txt');
  const files = build(config, root);
  files.set('preferences/new.txt', Buffer.from('new output'));
  await assert.rejects(async () => writeBundle(files, root), /Generated output edited locally/);
  assert.equal(await exists(newOutput), false);
});

test('missing and unapproved source skills fail closed', async () => {
  const missing = await fixture({ names: ['missing'] });
  const missingConfig = JSON.parse(await read(path.join(missing.root, '.local', 'sources.json')));
  await fs.rm(missing.skill, { recursive: true, force: true });
  assert.throws(() => build(missingConfig, missing.root), /Missing skill entrypoint: missing/);

  const extra = await fixture();
  await fs.mkdir(path.join(extra.source, 'new-skill'), { recursive: true });
  await fs.writeFile(path.join(extra.source, 'new-skill', 'SKILL.md'), '---\nname: new-skill\ndescription: new\n---\n');
  const extraConfig = JSON.parse(await read(path.join(extra.root, '.local', 'sources.json')));
  assert.throws(() => build(extraConfig, extra.root), /New skills need public-export review/);
});

test('private terms and credential patterns block before output writes', async () => {
  const privateFixture = await fixture({ sourceText: '---\nname: demo\ndescription: demo\n---\nPRIVATE_PROJECT\n', deniedTerms: ['PRIVATE_PROJECT'] });
  const privateConfig = JSON.parse(await read(path.join(privateFixture.root, '.local', 'sources.json')));
  assert.throws(() => build(privateConfig, privateFixture.root), /private-content rule/);
  assert.equal(await exists(path.join(privateFixture.root, 'skills')), false);

  const tokenFixture = await fixture({ sourceText: '---\nname: demo\ndescription: demo\n---\nghp_' + '123456789012345678901234567890123456\n' });
  const tokenConfig = JSON.parse(await read(path.join(tokenFixture.root, '.local', 'sources.json')));
  assert.throws(() => build(tokenConfig, tokenFixture.root), /GitHub credential/);
  assert.equal(await exists(path.join(tokenFixture.root, 'skills')), false);
});

test('credentials are scanned before replacements can redact them', async () => {
  const fake = 'ghp_' + '123456789012345678901234567890123456';
  const result = await fixture({
    sourceText: `---\nname: demo\ndescription: demo\n---\n${fake}\n`,
    replacements: [[fake, '[REDACTED]']],
  });
  const config = JSON.parse(await read(path.join(result.root, '.local', 'sources.json')));
  assert.throws(() => build(config, result.root), /GitHub credential/);
  assert.equal(await exists(path.join(result.root, 'skills')), false);
});

test('hidden secrets directories are excluded and sensitive filenames are refused', async () => {
  const result = await fixture();
  await fs.mkdir(path.join(result.skill, '.secrets'), { recursive: true });
  await fs.writeFile(path.join(result.skill, '.secrets', 'token.txt'), 'secret fixture');
  const config = JSON.parse(await read(path.join(result.root, '.local', 'sources.json')));
  assert.throws(() => build(config, result.root), /Private source path refused/);

  await fs.rm(path.join(result.skill, '.secrets'), { recursive: true, force: true });
  await fs.writeFile(path.join(result.skill, 'credentials.json'), 'private fixture');
  assert.throws(() => build(config, result.root), /Excluded private filename|Private source path refused/);
});

test('plugin SOURCE.json hashes are enforced before plugin publication', async () => {
  const plugin = path.join(tmp, 'plugin');
  await fs.mkdir(path.join(plugin, '.codex-plugin'), { recursive: true });
  const manifestPath = path.join(plugin, '.codex-plugin', 'plugin.json');
  const pluginJson = '{"name":"fixture-plugin"}\n';
  await fs.writeFile(manifestPath, pluginJson);
  await fs.writeFile(path.join(plugin, 'SOURCE.json'), JSON.stringify({
    files: [{ path: '.codex-plugin/plugin.json', sha256: digest(Buffer.from(pluginJson)) }],
  }));
  const result = await fixture({ pluginRoot: plugin });
  const config = JSON.parse(await read(path.join(result.root, '.local', 'sources.json')));
  assert.doesNotThrow(() => build(config, result.root));
  await fs.writeFile(manifestPath, '{"name":"drifted"}\n');
  assert.throws(() => build(config, result.root), /ECC upstream provenance drift/);
});

test('approved overrides replace source snapshots before publication', async () => {
  const clean = '---\nname: demo\ndescription: generic\n---\nPublic content only.\n';
  const result = await fixture({
    sourceText: '---\nname: demo\ndescription: private\n---\nPRIVATE_SOURCE_SNAPSHOT\n',
    deniedTerms: ['PRIVATE_SOURCE_SNAPSHOT'],
    overrides: { 'overrides/demo.md': clean },
  });
  const config = JSON.parse(await read(path.join(result.root, '.local', 'sources.json')));
  config.overrides = { 'skills/demo/SKILL.md': 'overrides/demo.md' };
  await fs.writeFile(path.join(result.root, '.local', 'sources.json'), JSON.stringify(config, null, 2));
  const files = build(config, result.root);
  assert.equal(files.get('skills/demo/SKILL.md').toString(), clean);
  assert.doesNotMatch(files.get('skills/demo/SKILL.md').toString(), /PRIVATE_SOURCE_SNAPSHOT/);
});

test('safePath rejects traversal and unsafe path syntax', async () => {
  assert.throws(() => safePath(tmp, '../outside'), /Unsafe relative path|Path escaped root/);
  assert.throws(() => safePath(tmp, 'a\\b'), /Unsafe relative path/);
  assert.throws(() => safePath(tmp, 'a/./b'), /Unsafe relative path/);
  assert.throws(() => safePath(tmp, 'C:evil'), /Unsafe relative path/);
});

test('scan rejects credentials and denied terms while allowing ordinary text', () => {
  assert.doesNotThrow(() => scan(Buffer.from('ordinary example text'), 'example.md'));
  assert.throws(() => scan(Buffer.from('-----BEGIN ' + 'PRIVATE KEY-----'), 'key.txt'), /private key/);
  assert.throws(() => scan(Buffer.from('https://' + 'user:pass@example.test/a'), 'url.md'), /authenticated URL/);
  assert.throws(() => scan(Buffer.from('PRIVATE_NAME'), 'note.md', ['private_name']), /private-content rule/);
});

test('run dry-run uses the configured fixture without writing generated output', async () => {
  const { root } = await fixture();
  const result = run(['--dry-run'], root);
  assert.equal(result.status, 'preview');
  assert.equal(result.skills, 1);
  assert.equal(await exists(path.join(root, 'skills')), false);
});

test('publish refuses non-main and dirty checkouts before export', async () => {
  const { root } = await fixture();
  const git = (args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-b', 'dev']);
  git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'user.name', 'Sync Test']);
  git(['add', '.gitignore', 'templates/preamble.md']);
  git(['commit', '-m', 'fixture']);
  const config = JSON.parse(await read(path.join(root, '.local', 'sources.json')));
  config.remote = path.join(tmp, 'remote.git');
  await fs.writeFile(path.join(root, '.local', 'sources.json'), JSON.stringify(config, null, 2));
  assert.throws(() => run(['--publish'], root), /Publishing requires main/);
  assert.equal(await exists(path.join(root, 'skills')), false);
});

test('reviewed publication commits to a bare remote and retries as a clean no-op', async () => {
  const plugin = path.join(tmp, 'publisher-plugin');
  await fs.mkdir(path.join(plugin, '.codex-plugin'), { recursive: true });
  const pluginJson = '{"name":"fixture-plugin"}\n';
  await fs.writeFile(path.join(plugin, '.codex-plugin', 'plugin.json'), pluginJson);
  await fs.writeFile(path.join(plugin, 'SOURCE.json'), JSON.stringify({
    files: [{ path: '.codex-plugin/plugin.json', sha256: digest(Buffer.from(pluginJson)) }],
  }));
  const result = await fixture({ pluginRoot: plugin });
  const configPath = path.join(result.root, '.local', 'sources.json');
  const remote = path.join(tmp, 'remote.git');
  const config = JSON.parse(await read(configPath));
  config.remote = remote;
  config.requireReview = true;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  assert.equal(run([], result.root).status, 'exported');
  execFileSync('git', ['init', '--bare', remote], { encoding: 'utf8' });
  git(result.root, ['init', '-b', 'main']);
  git(result.root, ['config', 'user.email', 'test@example.invalid']);
  git(result.root, ['config', 'user.name', 'Sync Test']);
  git(result.root, ['remote', 'add', 'origin', remote]);
  git(result.root, ['add', '.gitignore', 'templates', 'skills', 'preferences', 'plugins', 'bundle.manifest.json']);
  git(result.root, ['commit', '-m', 'initial bundle']);
  git(result.root, ['push', 'origin', 'HEAD:main']);

  await fs.writeFile(path.join(result.skill, 'SKILL.md'), '---\nname: demo\ndescription: A demo skill\n---\nUpdated public content.\n');
  const review = run(['--review'], result.root);
  assert.equal(review.status, 'review');
  assert.match(await read(path.join(result.root, '.local', 'review.md')), /Updated public content/);
  const published = run(['--publish', '--reviewed', review.fingerprint], result.root);
  assert.equal(published.status, 'published');
  assert.match(git(remote, ['show', 'main:skills/demo/SKILL.md']), /Updated public content/);
  assert.equal(git(result.root, ['status', '--porcelain']), '');

  const noop = run(['--publish', '--reviewed', review.fingerprint], result.root);
  assert.equal(noop.status, 'unchanged');

  await fs.writeFile(path.join(result.skill, 'SKILL.md'), '---\nname: demo\ndescription: A demo skill\n---\nSecond update.\n');
  const secondReview = run(['--review'], result.root);
  const remoteBeforeMismatch = git(remote, ['rev-parse', 'main']);
  const generatedBeforeMismatch = await read(path.join(result.root, 'skills', 'demo', 'SKILL.md'));
  assert.throws(() => run(['--publish', '--reviewed', review.fingerprint], result.root), /exact reviewed preview fingerprint/);
  assert.equal(git(remote, ['rev-parse', 'main']), remoteBeforeMismatch);
  assert.equal(await read(path.join(result.root, 'skills', 'demo', 'SKILL.md')), generatedBeforeMismatch);

  const clone = path.join(tmp, 'remote-clone');
  execFileSync('git', ['clone', '--branch', 'main', remote, clone], { encoding: 'utf8' });
  git(clone, ['config', 'user.email', 'test@example.invalid']);
  git(clone, ['config', 'user.name', 'Sync Test']);
  await fs.writeFile(path.join(clone, 'remote-note.txt'), 'remote change\n');
  git(clone, ['add', 'remote-note.txt']);
  git(clone, ['commit', '-m', 'remote change']);
  git(clone, ['push', 'origin', 'HEAD:main']);
  assert.throws(() => run(['--publish', '--reviewed', secondReview.fingerprint], result.root), /Remote has newer commits/);

  await fs.appendFile(path.join(result.root, 'skills', 'demo', 'SKILL.md'), 'local edit\n');
  assert.throws(() => run(['--publish', '--reviewed', secondReview.fingerprint], result.root), /Publisher checkout is dirty/);
});
