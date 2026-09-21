const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const pluginRoot = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecc-hook-test-"));
const project = path.join(temp, "project");
fs.mkdirSync(path.join(project, ".ecc"), { recursive: true });
fs.writeFileSync(path.join(project, ".ecc", "checkpoint.md"), "checkpoint: verify runtime evidence before promotion");

function run(command, input, cwd = project) {
  return spawnSync(command, {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
    shell: true,
    env: { ...process.env, PLUGIN_ROOT: pluginRoot },
  });
}

const windowsCommand = "node -e \"require(require('path').join(process.env.PLUGIN_ROOT,'scripts','lifecycle.cjs'))\"";
const start = run(windowsCommand, { hook_event_name: "SessionStart", source: "startup", cwd: project });
assert.equal(start.status, 0, start.stderr);
const startJson = JSON.parse(start.stdout);
assert.equal(startJson.hookSpecificOutput.hookEventName, "SessionStart");
assert.match(startJson.hookSpecificOutput.additionalContext, /checkpoint: verify runtime evidence/);
assert.match(startJson.hookSpecificOutput.additionalContext, /unresolved verification gaps/);

const unknown = run(windowsCommand, { hook_event_name: "UnknownEvent", cwd: project });
assert.equal(unknown.status, 0, unknown.stderr);
assert.equal(unknown.stdout, "");

const hugeFile = path.join(project, ".ecc", "state.md");
fs.writeFileSync(hugeFile, "x".repeat(1024 * 1024));
const bounded = run(windowsCommand, { hook_event_name: "SessionStart", cwd: project });
assert.equal(bounded.status, 0, bounded.stderr);
const boundedContext = JSON.parse(bounded.stdout).hookSpecificOutput.additionalContext;
assert.ok(Buffer.byteLength(boundedContext, "utf8") <= 16 * 1024);
assert.ok(boundedContext.includes("x".repeat(100)));

const oversized = run(windowsCommand, {hook_event_name:'SessionStart',prompt:'x'.repeat(1024*1024+1),cwd:project});
assert.equal(oversized.status,0,oversized.stderr);
assert.equal(oversized.stdout,'');

const linkedProject = path.join(temp,'linked-project');
const outside = path.join(temp,'outside');
fs.mkdirSync(linkedProject);fs.mkdirSync(outside);
fs.writeFileSync(path.join(outside,'checkpoint.md'),'symlink-secret-must-not-load');
let canLink = true;
try {
  fs.symlinkSync(outside,path.join(linkedProject,'.ecc'),'junction');
} catch (error) {
  if (!['EPERM','EACCES','UNKNOWN'].includes(error.code)) throw error;
  canLink=false; console.log('Junction creation unavailable; junction scenario not run');
}
if(canLink){
  const linked = run(windowsCommand, { hook_event_name: "SessionStart", cwd: linkedProject },linkedProject);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(JSON.parse(linked.stdout).hookSpecificOutput.additionalContext.includes("symlink-secret"), false);
}
// A worktree has a .git file, not a directory; don't read an ancestor's state.
const parentProject=path.join(temp,'parent');
const worktree=path.join(parentProject,'worktree');
fs.mkdirSync(path.join(parentProject,'.ecc'),{recursive:true});fs.mkdirSync(worktree);
fs.writeFileSync(path.join(parentProject,'.ecc','checkpoint.md'),'parent-secret-must-not-load');
fs.writeFileSync(path.join(worktree,'.git'),'gitdir: fixture');
const isolated=run(windowsCommand,{hook_event_name:'SessionStart',cwd:worktree},worktree);
assert.equal(isolated.status,0,isolated.stderr);
assert.ok(!JSON.parse(isolated.stdout).hookSpecificOutput.additionalContext.includes('parent-secret'));
// Keep only disposable temp fixtures; no recursive deletion across junctions.
console.log("lifecycle hook Windows command, stdin/stdout, bounds, unknown events, and symlink behavior passed");
