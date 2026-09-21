#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LOCK_WAIT_MS = 100;
const DEFAULT_LOCK_TIMEOUT_MS = 30_000;

function fail(message, code = 2) {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
}

function usage() {
  return `Usage:
  node scripts/runtime.cjs --project <absolute-project> work-item <list|show|upsert|close|claim> [args...]
  node scripts/runtime.cjs --project <absolute-project> status [--write <name>]
  node scripts/runtime.cjs --project <absolute-project> doctor [--target <target>]
  node scripts/runtime.cjs --project <absolute-project> session-inspect --target <rollout-or-history-file> [--write <name>]

The state database is always <project>\\.ecc\\state.db. Output writes are limited to <project>\\.ecc.
No installer, hook, MCP server, network sync, tmux session, or provider command is started.`;
}

function valueAfter(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) fail(`Missing value for ${flag}`);
  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  if (args[0] !== '--project') fail('The first option must be --project <absolute-project>.');
  const projectArg = valueAfter(args, 0, '--project');
  const project = path.resolve(projectArg);
  if (!path.isAbsolute(projectArg) || !path.isAbsolute(project)) {
    fail('--project must be an absolute path.');
  }
  const command = args[2];
  if (!command) fail('Missing runtime command.');
  return { project, command, args: args.slice(3) };
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function projectPaths(project) {
  const eccDir = path.join(project, '.ecc');
  return { eccDir, db: path.join(eccDir, 'state.db'), lock: path.join(eccDir, 'runtime.lock') };
}

function ensureProject(project) {
  let stats;
  try { stats = fs.statSync(project); } catch { fail(`Project does not exist: ${project}`); }
  if (!stats.isDirectory()) fail(`Project is not a directory: ${project}`);
  if (fs.lstatSync(project).isSymbolicLink()) fail(`Project may not be a symlink or junction: ${project}`);
  rejectSymlinkAncestors(project);
}

function rejectSymlinkAncestors(target, stopAt = null) {
  let current = path.resolve(target);
  const boundary = stopAt ? path.resolve(stopAt) : null;
  while (true) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
      fail(`Path may not contain a symlink or junction: ${current}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (current === boundary || path.dirname(current) === current) return;
    const parent = path.dirname(current);
    current = parent;
  }
}

function parseSingleValue(args, flag) {
  let value = null;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) continue;
    if (value !== null) fail(`${flag} may only be supplied once.`);
    value = valueAfter(args, index, flag);
    index += 1;
  }
  return value;
}

function acquireLock(lockPath, timeoutMs = (() => {
  const parsed = Number(process.env.ECC_RUNTIME_LOCK_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOCK_TIMEOUT_MS;
})()) {
  const started = Date.now();
  while (true) {
    if (fs.existsSync(lockPath) && fs.lstatSync(lockPath).isSymbolicLink()) {
      fail(`Runtime lock may not be a symlink or junction: ${lockPath}`);
    }
    try {
      fs.mkdirSync(lockPath, { recursive: false });
      fs.writeFileSync(path.join(lockPath, 'owner.json'), JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString() }) + '\n', 'utf8');
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - started >= timeoutMs) {
        fail(`Runtime lock is held at ${lockPath}; inspect the owner and remove it manually only after confirming no runtime is active.`, 75);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_WAIT_MS);
    }
  }
}

function releaseLock(lockPath) {
  try {
    const ownerPath = path.join(lockPath, 'owner.json');
    if (fs.existsSync(ownerPath)) fs.unlinkSync(ownerPath);
    fs.rmdirSync(lockPath);
  } catch (error) {
    console.error(`[runtime] warning: could not release lock ${lockPath}: ${error.message}`);
  }
}

function outputPath(project, eccDir, value) {
  const resolved = path.resolve(eccDir, value);
  if (!inside(eccDir, resolved) || resolved === eccDir) fail(`Output must stay under ${eccDir}: ${value}`);
  rejectSymlinkAncestors(resolved);
  return resolved;
}

function requireExistingFile(project, value) {
  const resolved = path.resolve(project, value);
  let stats;
  try { stats = fs.statSync(resolved); } catch { fail(`Session target does not exist: ${resolved}`); }
  if (!stats.isFile()) fail(`Session target is not a regular file: ${resolved}`);
  return resolved;
}

function vendorScript(name) {
  const script = path.join(__dirname, '..', 'vendor', 'scripts', name);
  if (!fs.existsSync(script)) fail(`Vendored ECC script is missing: ${script}`);
  return script;
}

function runScript(scriptName, args, project) {
  const result = spawnSync(process.execPath, [vendorScript(scriptName), ...args], {
    cwd: project,
    env: {
      ...process.env,
      ECC_SESSION_RECORDING_DIR: path.join(project, '.ecc', 'session-recordings'),
      ECC_RUNTIME_PROJECT: project
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30_000,
    killSignal: 'SIGTERM'
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.signal === 'SIGTERM' && result.status === null) fail(`ECC child command timed out: ${scriptName}`, 124);
  process.exitCode = result.status === null ? 1 : result.status;
}

function execute(parsed) {
  ensureProject(parsed.project);
  const paths = projectPaths(parsed.project);
  rejectSymlinkAncestors(paths.eccDir);
  fs.mkdirSync(paths.eccDir, { recursive: true });
  acquireLock(paths.lock);
  try {
    const args = parsed.args;
    if (parsed.command === 'work-item') {
      const subcommand = args[0];
      if (!['list', 'show', 'upsert', 'close', 'claim'].includes(subcommand)) fail(`Unsupported work-item command: ${subcommand || '(missing)'}`);
      if (args.includes('--db')) fail('work-item does not allow --db; the project-local database is fixed.');
      const repoIndex = args.indexOf('--repo-root');
      if (repoIndex >= 0 && path.resolve(valueAfter(args, repoIndex, '--repo-root')) !== parsed.project) fail('work-item --repo-root must equal --project.');
      runScript('work-items.js', [subcommand, ...args.slice(1), '--db', paths.db, ...(subcommand === 'upsert' && !args.includes('--repo-root') ? ['--repo-root', parsed.project] : [])], parsed.project);
      return;
    }
    if (parsed.command === 'status') {
      const writeValue = parseSingleValue(args, '--write');
      if (args.some((arg, index) => arg !== '--write' && arg !== writeValue && (args[index - 1] !== '--write'))) fail('status accepts only optional --write <name>.');
      const forwarded = ['--db', paths.db, '--json'];
      if (writeValue !== null) {
        forwarded.push('--write', outputPath(parsed.project, paths.eccDir, writeValue));
      }
      runScript('status.js', forwarded, parsed.project);
      return;
    }
    if (parsed.command === 'doctor') {
      const forwarded = ['--json'];
      const targetValue = parseSingleValue(args, '--target');
      if (args.some((arg, index) => arg !== '--target' && arg !== targetValue && args[index - 1] !== '--target')) fail('doctor accepts only optional --target <target>.');
      if (targetValue !== null) forwarded.push('--target', targetValue);
      runScript('doctor.js', forwarded, parsed.project);
      return;
    }
    if (parsed.command === 'session-inspect') {
      const targetValue = parseSingleValue(args, '--target');
      if (targetValue === null) fail('session-inspect requires --target <explicit-file>.');
      const writeValue = parseSingleValue(args, '--write');
      if (args.some((arg, index) => !['--target', '--write'].includes(arg) && arg !== targetValue && arg !== writeValue && args[index - 1] !== '--target' && args[index - 1] !== '--write')) fail('session-inspect accepts --target <file> and optional --write <name>.');
      rejectSymlinkAncestors(path.join(paths.eccDir, 'session-recordings'));
      const forwarded = [requireExistingFile(parsed.project, targetValue)];
      if (writeValue !== null) forwarded.push('--write', outputPath(parsed.project, paths.eccDir, writeValue));
      runScript('session-inspect.js', forwarded, parsed.project);
      return;
    }
    fail(`Unsupported runtime command: ${parsed.command}`);
  } finally {
    releaseLock(paths.lock);
  }
}

function main(argv = process.argv) {
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) console.log(usage());
    else execute(parsed);
  } catch (error) {
    console.error(`[runtime] ${error.message}`);
    process.exitCode = error.exitCode || 1;
  }
}

if (require.main === module) main();

module.exports = { inside, main, parseArgs, projectPaths };
