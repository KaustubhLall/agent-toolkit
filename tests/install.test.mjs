import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { installBundle, uninstallBundle } from '../tools/install.mjs';
import { spawn } from 'node:child_process';

let tmp;
const hash = (b) => createHash('sha256').update(b).digest('hex');
async function fixture() {
  const root = path.join(tmp, 'bundle');
  await fs.mkdir(path.join(root, 'skills', 'demo'), { recursive: true });
  await fs.mkdir(path.join(root, 'plugins', 'ecc-workbench', 'skills', 'library'), { recursive: true });
  await fs.mkdir(path.join(root, 'plugins', 'ecc-workbench', 'skills', 'operations'), { recursive: true });
  await fs.mkdir(path.join(root, 'preferences'), { recursive: true });
  const files = {
    'skills/demo/SKILL.md': '# Demo\nHome={{HOME}} Vault={{VAULT}}',
    'plugins/ecc-workbench/skills/library/SKILL.md': '# Library',
    'plugins/ecc-workbench/skills/operations/SKILL.md': '# Operations',
    'preferences/AGENTS.md': 'Use toolkit at {{TOOLKIT}}.\n',
  };
  const manifest = {};
  for (const [rel, text] of Object.entries(files)) { const full = path.join(root, rel); await fs.writeFile(full, text); manifest[rel] = hash(Buffer.from(text)); }
  await fs.writeFile(path.join(root, 'bundle.manifest.json'), JSON.stringify({ schema: 1, files: manifest }, null, 2));
  return root;
}
beforeEach(async () => { tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agent-toolkit-'))); });
afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

test('installs codex and claude targets, verifies hashes, and is idempotent', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  const first = await installBundle({ root, home, targets: ['codex', 'claude'], apply: true });
  assert.equal(first.mode, 'applied');
  const skill = await fs.readFile(path.join(home, '.agents', 'skills', 'demo', 'SKILL.md'), 'utf8');
  assert.match(skill, /Home=/); assert.match(skill, /Vault=/);
  const second = await installBundle({ root, home, targets: ['codex', 'claude'], apply: true });
  assert.equal(second.results.filter((x) => x.action === 'update').length, second.results.length);
  assert.equal(hash(await fs.readFile(path.join(home, '.claude', 'skills', 'demo', 'SKILL.md'))), hash(Buffer.from(skill.replace(home, home))));
  assert.match(await fs.readFile(path.join(home, '.agent-toolkit', 'plugins', 'ecc-workbench', 'skills', 'library', 'SKILL.md'), 'utf8'), /Library/);
  assert.match(await fs.readFile(path.join(home, '.agents', 'skills', 'ecc-library', 'SKILL.md'), 'utf8'), /^---[\s\S]*name: ecc-library[\s\S]*description:/);
});

test('updates from v1 to v2 and uninstall restores the original bytes', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  const skill = path.join(home, '.agents', 'skills', 'demo', 'SKILL.md'); const instruction = path.join(home, '.codex', 'AGENTS.md');
  await fs.mkdir(path.dirname(skill), { recursive: true }); await fs.mkdir(path.dirname(instruction), { recursive: true });
  const originalSkill = `# Demo\nHome=${home.replaceAll('\\', '/')} Vault=${path.join(home, '.agent-toolkit', 'knowledge').replaceAll('\\', '/')}`;
  await fs.writeFile(skill, originalSkill); await fs.writeFile(instruction, 'original instructions\n');
  await installBundle({ root, home, targets: ['codex'], apply: true });
  const manifestPath = path.join(root, 'bundle.manifest.json'); const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const source = path.join(root, 'skills', 'demo', 'SKILL.md'); await fs.writeFile(source, '# Demo v2\n{{HOME}}'); manifest.files['skills/demo/SKILL.md'] = hash(await fs.readFile(source)); await fs.writeFile(manifestPath, JSON.stringify(manifest));
  await installBundle({ root, home, targets: ['codex'], apply: true }); assert.match(await fs.readFile(skill, 'utf8'), /v2/);
  await uninstallBundle({ home, apply: true }); assert.equal(await fs.readFile(skill, 'utf8'), originalSkill); assert.equal(await fs.readFile(instruction, 'utf8'), 'original instructions\n');
});

test('dry run performs no writes and unmanaged conflicts fail before writes', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  const dry = await installBundle({ root, home, targets: ['codex'] }); assert.equal(dry.mode, 'dry-run');
  await fs.mkdir(path.join(home, '.agents', 'skills', 'demo'), { recursive: true });
  await fs.writeFile(path.join(home, '.agents', 'skills', 'demo', 'SKILL.md'), 'user file');
  await assert.rejects(installBundle({ root, home, targets: ['codex'], apply: true }), /destination conflict/);
  assert.equal(await fs.readFile(path.join(home, '.agents', 'skills', 'demo', 'SKILL.md'), 'utf8'), 'user file');
});

test('preserves surrounding instructions and detects managed edits', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  const instruction = path.join(home, '.codex', 'AGENTS.md'); await fs.mkdir(path.dirname(instruction), { recursive: true }); await fs.writeFile(instruction, 'before\n');
  await installBundle({ root, home, targets: ['codex'], apply: true });
  assert.match(await fs.readFile(instruction, 'utf8'), /^before[\s\S]*agent-toolkit:start/);
  await fs.writeFile(instruction, (await fs.readFile(instruction, 'utf8')).replace('Use toolkit', 'User changed'));
  await assert.rejects(installBundle({ root, home, targets: ['codex'], apply: true }), /managed instruction block was edited/);
});

test('tampered manifest and traversal entries are rejected', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  const manifestPath = path.join(root, 'bundle.manifest.json');
  const m = JSON.parse(await fs.readFile(manifestPath, 'utf8')); m.files['../escape'] = '0'.repeat(64); await fs.writeFile(manifestPath, JSON.stringify(m));
  await assert.rejects(installBundle({ root, home, targets: ['generic'], apply: true }), /outside the portable bundle allowlist|unsafe bundle path/);
});

test('actual bundle hash mismatch and forged receipt are rejected', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home'); const source = path.join(root, 'skills', 'demo', 'SKILL.md');
  await fs.appendFile(source, 'tampered'); await assert.rejects(installBundle({ root, home, targets: ['generic'], apply: true }), /manifest hash mismatch/);
  await fs.mkdir(path.join(home, '.agent-toolkit'), { recursive: true }); await fs.writeFile(path.join(home, '.agent-toolkit', 'install-state.json'), JSON.stringify({ schema: 1, files: { [path.join(home, 'secret.txt')]: { installedHash: 'a'.repeat(64), kind: 'file' } } }));
  await assert.rejects(uninstallBundle({ home, apply: true }), /unsafe install receipt entry/);
});

test('later conflict causes no partial writes', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  await fs.mkdir(path.join(home, '.agents', 'skills', 'demo'), { recursive: true }); await fs.writeFile(path.join(home, '.agents', 'skills', 'demo', 'SKILL.md'), 'conflict');
  const pref = path.join(home, '.codex', 'AGENTS.md'); await assert.rejects(installBundle({ root, home, targets: ['codex'], apply: true }), /destination conflict/);
  assert.equal(await fs.access(pref).then(() => true, () => false), false);
});

test('CLI supports --uninstall --apply', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home'); await installBundle({ root, home, targets: ['generic'], apply: true });
  const cli = path.resolve('tools/install.mjs'); const result = await new Promise((resolve, reject) => { const p = spawn(process.execPath, [cli, '--uninstall', '--apply', '--home', home], { cwd: path.dirname(cli) }); let out = ''; p.stdout.on('data', (d) => { out += d; }); p.on('error', reject); p.on('close', (code) => code ? reject(new Error(out)) : resolve(out)); });
  assert.match(result, /"mode": "applied"/);
});

test('drift is preserved on uninstall while unchanged outputs are removed', async () => {
  const root = await fixture(); const home = path.join(tmp, 'home');
  await installBundle({ root, home, targets: ['generic'], apply: true });
  const skill = path.join(home, '.agent-toolkit', 'skills', 'demo', 'SKILL.md'); await fs.appendFile(skill, '\nuser edit');
  const result = await uninstallBundle({ home, apply: true });
  assert.ok(result.results.some((x) => x.action === 'preserve-drift')); assert.match(await fs.readFile(skill, 'utf8'), /user edit/);
  const instruction = path.join(home, '.agent-toolkit', 'AGENTS.md'); assert.doesNotMatch(await fs.readFile(instruction, 'utf8'), /agent-toolkit:start/);
});
