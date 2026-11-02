import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const router = path.join(root, 'skills', 'orchestrator', 'scripts', 'bounded-read.cjs');
const gate = path.join(root, 'plugins', 'ecc-workbench', 'vendor', 'scripts', 'hooks', 'read-routing-gate.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-toolkit-bounded-read-'));
const large = path.join(temp, 'large.js');
const lines = Array.from({ length: 500 }, (_, index) => (
  index === 200
    ? 'function cacheNeedle() { return cacheStore.read("caller"); }'
    : `const value${index} = ${index};`
));
fs.writeFileSync(large, `${lines.join('\n')}\n`);
const small = path.join(temp, 'small.js');
fs.writeFileSync(small, 'export const small = true;\n');
const minified = path.join(temp, 'minified.json');
fs.writeFileSync(minified, `{"payload":"${'x'.repeat(60000)}"}`);

function runNode(script, args, input = '', env = {}, cwd = temp) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    windowsHide: true,
  });
}

function hookInput(tool, toolInput) {
  return JSON.stringify({ tool_name: tool, cwd: temp, tool_input: toolInput });
}

test('bounded reader returns deterministic, location-bearing excerpts without a worker', () => {
  const result = runNode(router, ['--question', 'where is the cache caller?', '--paths', large]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mode: deterministic-excerpt/);
  assert.match(result.stdout, new RegExp(`\\[${large.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:199-203\\]`));
  assert.match(result.stdout, /201: function cacheNeedle/);
  assert.ok(Buffer.byteLength(result.stdout) < fs.statSync(large).size, 'excerpt should be smaller than the direct file payload');
  assert.match(result.stdout, /no external model call was made/);
});

test('worker output is bounded and its locations are replaced with exact local text', () => {
  const worker = path.join(temp, 'worker.cjs');
  fs.writeFileSync(worker, [
    "const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));",
    "process.stdout.write(JSON.stringify({ answer: `worker answer ${input.files[0].content.length}`, excerpts: [{ path: input.files[0].path, start_line: 201, end_line: 201 }] }));",
  ].join('\n'));
  const result = runNode(
    router,
    ['--question', 'where is the cache caller?', '--paths', large],
    '',
    { ECC_READ_ROUTER_WORKER_BIN: process.execPath, ECC_READ_ROUTER_WORKER_ARGS: JSON.stringify([worker]) }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mode: delegated-worker/);
  const payloadLength = Number(result.stdout.match(/worker answer (\d+)/)?.[1]);
  assert.ok(Number.isFinite(payloadLength));
  assert.ok(payloadLength < fs.statSync(large).size, 'worker content should be bounded below the direct file payload');
  assert.match(result.stdout, /201: function cacheNeedle/);
});

test('worker answers without validated locations and worker reads of secret paths fail closed', () => {
  const answerOnly = path.join(temp, 'answer-only.cjs');
  fs.writeFileSync(answerOnly, "process.stdout.write(JSON.stringify({ answer: 'unsupported summary' }));\n");
  const answerOnlyResult = runNode(
    router,
    ['--question', 'where is the cache caller?', '--paths', large],
    '',
    { ECC_READ_ROUTER_WORKER_BIN: process.execPath, ECC_READ_ROUTER_WORKER_ARGS: JSON.stringify([answerOnly]) }
  );
  assert.equal(answerOnlyResult.status, 2);
  assert.match(answerOnlyResult.stderr, /at least one valid source location/);

  const secret = path.join(temp, '.env');
  fs.writeFileSync(secret, 'TOKEN=do-not-send\n');
  const secretResult = runNode(
    router,
    ['--question', 'find the token', '--paths', secret],
    '',
    { ECC_READ_ROUTER_WORKER_BIN: process.execPath, ECC_READ_ROUTER_WORKER_ARGS: JSON.stringify([answerOnly]) }
  );
  assert.equal(secretResult.status, 2);
  assert.match(secretResult.stderr, /sensitive path/);

  const credentials = path.join(temp, 'credentials.json');
  fs.writeFileSync(credentials, '{"token":"do-not-send"}\n');
  const credentialsResult = runNode(
    router,
    ['--question', 'find the token', '--paths', credentials],
    '',
    { ECC_READ_ROUTER_WORKER_BIN: process.execPath, ECC_READ_ROUTER_WORKER_ARGS: JSON.stringify([answerOnly]) }
  );
  assert.equal(credentialsResult.status, 2);
  assert.match(credentialsResult.stderr, /sensitive path/);

  const giantLine = path.join(temp, 'giant.js');
  fs.writeFileSync(giantLine, `const payload = "${'x'.repeat(100000)}";\n`);
  const giantResult = runNode(router, ['--question', 'find payload', '--paths', giantLine]);
  assert.equal(giantResult.status, 2);
  assert.match(giantResult.stderr, /line exceeds max/);

  const raceFile = path.join(temp, 'race.js');
  fs.copyFileSync(large, raceFile);
  const mutatingWorker = path.join(temp, 'mutating-worker.cjs');
  fs.writeFileSync(mutatingWorker, [
    "const fs = require('node:fs');",
    "const input = JSON.parse(fs.readFileSync(0, 'utf8'));",
    "fs.appendFileSync(input.files[0].path, '\\n// changed during worker execution');",
    "process.stdout.write(JSON.stringify({ answer: 'race', excerpts: [{ path: input.files[0].path, start_line: 201, end_line: 201 }] }));",
  ].join('\n'));
  const raceResult = runNode(
    router,
    ['--question', 'where is the cache caller?', '--paths', raceFile],
    '',
    { ECC_READ_ROUTER_WORKER_BIN: process.execPath, ECC_READ_ROUTER_WORKER_ARGS: JSON.stringify([mutatingWorker]) }
  );
  assert.equal(raceResult.status, 2);
  assert.match(raceResult.stderr, /source changed/);
});

test('worker fan-out and payload growth are bounded before execution', () => {
  const result = runNode(router, [
    '--question', 'what is this?', '--paths', large, large, large, large, large, large, large, large, small,
  ]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /max files is 8/);
});

test('PreToolUse gate denies large full reads and allows targeted reads', () => {
  const blocked = runNode(gate, [], hookInput('Read', { file_path: large }));
  assert.equal(blocked.status, 0, blocked.stderr);
  const decision = JSON.parse(blocked.stdout).hookSpecificOutput;
  assert.equal(decision.hookEventName, 'PreToolUse');
  assert.equal(decision.permissionDecision, 'deny');
  assert.match(decision.permissionDecisionReason, /350/);

  const targeted = runNode(gate, [], hookInput('Read', { file_path: large, offset: 200, limit: 10 }));
  assert.equal(targeted.status, 0, targeted.stderr);
  assert.equal(targeted.stdout, '');

  const smallRead = runNode(gate, [], hookInput('Read', { file_path: small }));
  assert.equal(smallRead.status, 0, smallRead.stderr);
  assert.equal(smallRead.stdout, '');

  const mcpRead = runNode(gate, [], hookInput('mcp__fs__read', { path: large }));
  assert.equal(JSON.parse(mcpRead.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const mcpWrite = runNode(gate, [], hookInput('mcp__fs__write_file', { path: large }));
  assert.equal(mcpWrite.stdout, '');

  const powershell = runNode(gate, [], hookInput('PowerShell', { command: `Get-Content -Raw "${large}"` }));
  assert.equal(JSON.parse(powershell.stdout).hookSpecificOutput.permissionDecision, 'deny');

  const boundedPowerShell = runNode(gate, [], hookInput('PowerShell', { command: `Get-Content -TotalCount 10 "${large}"` }));
  assert.equal(boundedPowerShell.stdout, '');

  const hooks = JSON.parse(fs.readFileSync(path.join(root, 'plugins', 'ecc-workbench', 'hooks', 'hooks.json'), 'utf8'));
  const matcher = new RegExp(hooks.hooks.PreToolUse[0].matcher);
  assert.equal(matcher.test('PowerShell'), true);
  assert.equal(matcher.test('mcp__fs__read'), true);
});

test('byte threshold catches minified files and shell pipes remain targeted', () => {
  const minifiedRead = runNode(gate, [], hookInput('Read', { file_path: minified }));
  assert.equal(minifiedRead.status, 0, minifiedRead.stderr);
  assert.equal(JSON.parse(minifiedRead.stdout).hookSpecificOutput.permissionDecision, 'deny');

  const cat = runNode(gate, [], hookInput('Bash', { command: `cat "${large}"` }));
  assert.equal(cat.status, 0, cat.stderr);
  assert.equal(JSON.parse(cat.stdout).hookSpecificOutput.permissionDecision, 'deny');

  const piped = runNode(gate, [], hookInput('Bash', { command: `cat "${large}" | Select-String -List cacheNeedle` }));
  assert.equal(piped.status, 0, piped.stderr);
  assert.equal(piped.stdout, '');

  const unboundedPiped = runNode(gate, [], hookInput('Bash', { command: `cat "${large}" | Select-String cacheNeedle` }));
  assert.equal(JSON.parse(unboundedPiped.stdout).hookSpecificOutput.permissionDecision, 'deny');

  const compound = runNode(gate, [], hookInput('Bash', { command: `echo ok; cat "${large}"` }));
  assert.equal(JSON.parse(compound.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

