'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const runtime = path.join(__dirname, '..', 'scripts', 'runtime.cjs');
const vendorStateStore = path.join(__dirname, '..', 'node_modules', 'sql.js');

function run(project, args) {
  return spawnSync(process.execPath, [runtime, '--project', project, ...args], { encoding: 'utf8' });
}

function runAsync(project, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runtime, '--project', project, ...args], { encoding: 'utf8' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
}

async function main() {
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-runtime-fixture-'));
const help = spawnSync(process.execPath, [runtime, '--help'], { encoding: 'utf8' });
assert.strictEqual(help.status, 0);
assert.match(help.stdout, /state database is always/i);
const invalid = spawnSync(process.execPath, [runtime, '--project', 'relative', 'status'], { encoding: 'utf8' });
assert.notStrictEqual(invalid.status, 0);
assert.match(invalid.stderr, /absolute path/i);
const traversal = run(project, ['status', '--write', '..\\outside.json']);
assert.notStrictEqual(traversal.status, 0);
assert.match(traversal.stderr, /stay under/i);
const unknown = run(project, ['status', '--unexpected']);
assert.notStrictEqual(unknown.status, 0);
assert.match(unknown.stderr, /only optional/i);

const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-runtime-outside-'));
const sentinel = path.join(outside, 'sentinel.txt');
fs.writeFileSync(sentinel, 'unchanged', 'utf8');
try {
  const link = path.join(project, '.ecc', 'output-link');
  fs.symlinkSync(outside, link, 'junction');
  const linkedOutput = run(project, ['status', '--write', 'output-link\\status.json']);
  assert.notStrictEqual(linkedOutput.status, 0);
  assert.strictEqual(fs.readFileSync(sentinel, 'utf8'), 'unchanged');
} catch (error) {
  if (!['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
}

fs.mkdirSync(path.join(project, '.ecc', 'runtime.lock'), { recursive: true });
fs.writeFileSync(path.join(project, '.ecc', 'runtime.lock', 'owner.json'), '{}');
const held = spawnSync(process.execPath, [runtime, '--project', project, 'status'], {
  encoding: 'utf8',
  env: { ...process.env, ECC_RUNTIME_LOCK_TIMEOUT_MS: '50' }
});
assert.strictEqual(held.status, 75);
fs.unlinkSync(path.join(project, '.ecc', 'runtime.lock', 'owner.json'));
fs.rmdirSync(path.join(project, '.ecc', 'runtime.lock'));

assert.ok(fs.existsSync(vendorStateStore), 'Pinned sql.js dependency is required for the runtime lifecycle test.');

const create = run(project, ['work-item', 'upsert', 'fixture-1', '--title', 'Fixture task', '--source', 'manual', '--status', 'open', '--json']);
assert.strictEqual(create.status, 0, create.stderr);
assert.strictEqual(JSON.parse(create.stdout).id, 'fixture-1');
const listed = run(project, ['work-item', 'list', '--json']);
assert.strictEqual(listed.status, 0, listed.stderr);
assert.strictEqual(JSON.parse(listed.stdout).items.length, 1);
const claimed = run(project, ['work-item', 'claim', 'fixture-1', '--owner', 'fixture-owner', '--as', 'human', '--json']);
assert.strictEqual(claimed.status, 0, claimed.stderr);
const closed = run(project, ['work-item', 'close', 'fixture-1', '--status', 'done', '--json']);
assert.strictEqual(closed.status, 0, closed.stderr);
assert.strictEqual(JSON.parse(closed.stdout).status, 'done');
assert.ok(fs.existsSync(path.join(project, '.ecc', 'state.db')));
const status = run(project, ['status', '--write', 'status.json']);
assert.strictEqual(status.status, 0, status.stderr);
assert.ok(fs.existsSync(path.join(project, '.ecc', 'status.json')));

const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) => runAsync(project, ['work-item', 'upsert', `concurrent-${index}`, '--title', `concurrent-${index}`, '--source', 'manual', '--status', 'open', '--json'])));
for (const result of concurrent) assert.strictEqual(result.status, 0, result.stderr);
const afterConcurrent = JSON.parse(run(project, ['work-item', 'list', '--json']).stdout);
assert.strictEqual(afterConcurrent.items.filter(item => item.id.startsWith('concurrent-')).length, 8);

const sessionFile = path.join(project, '2026-03-13-a1b2c3d4-session.tmp');
fs.writeFileSync(sessionFile, '# Fixture Session\n\n**Branch:** fixture/runtime\n', 'utf8');
const session = run(project, ['session-inspect', '--target', sessionFile, '--write', 'session.json']);
assert.strictEqual(session.status, 0, session.stderr);
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(project, '.ecc', 'session.json'), 'utf8')).adapterId, 'claude-history');
console.log('PASS: project-local work-item lifecycle');
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
