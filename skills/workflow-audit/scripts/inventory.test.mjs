import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, utimes, writeFile, mkdir, symlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inventory } from "./inventory.mjs";

const execFileAsync = promisify(execFile);

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "workflow-audit-"));
  const skill = path.join(root, "alpha");
  await mkdir(path.join(skill, "references"), { recursive: true });
  await writeFile(path.join(skill, "SKILL.md"), "---\nname: alpha\n---\nA\n");
  await writeFile(path.join(skill, "LICENSE.txt"), "MIT\n");
  await writeFile(path.join(skill, "references", "guide.md"), "reference A\n");
  await writeFile(path.join(skill, "config.json"), '{"secret":"do-not-read"}\n');
  await writeFile(path.join(skill, "references", ".env.local"), "TOKEN=do-not-read\n");
  return { root, skill };
}

test("same mtime but changed entrypoint bytes changes identity", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const stat = await readFile(path.join(f.skill, "SKILL.md"));
  const fixed = new Date("2020-01-01T00:00:00Z");
  await utimes(path.join(f.skill, "SKILL.md"), fixed, fixed);
  const before = (await inventory([f.root])).roots[0].skills[0];
  await writeFile(path.join(f.skill, "SKILL.md"), Buffer.concat([stat, Buffer.from("changed\n")]));
  await utimes(path.join(f.skill, "SKILL.md"), fixed, fixed);
  const after = (await inventory([f.root])).roots[0].skills[0];
  assert.notEqual(after.contentSha256, before.contentSha256);
});

test("copy or move placement does not change content identity", async (t) => {
  const f = await fixture();
  const copiedRoot = await mkdtemp(path.join(tmpdir(), "workflow-audit-copy-"));
  t.after(() => Promise.all([rm(f.root, { recursive: true, force: true }), rm(copiedRoot, { recursive: true, force: true })]));
  await cp(f.skill, path.join(copiedRoot, "different-name"), { recursive: true });
  const original = (await inventory([f.root])).roots[0].skills[0].contentSha256;
  const copied = (await inventory([copiedRoot])).roots[0].skills[0].contentSha256;
  assert.equal(copied, original);
});

test("reference-only changes change the whole-folder identity", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const before = (await inventory([f.root])).roots[0].skills[0].contentSha256;
  await writeFile(path.join(f.skill, "references", "guide.md"), "reference B\n");
  const after = (await inventory([f.root])).roots[0].skills[0].contentSha256;
  assert.notEqual(after, before);
});

test("root argument order does not change deterministic JSON", async (t) => {
  const first = await fixture();
  const second = await fixture();
  t.after(() => Promise.all([rm(first.root, { recursive: true, force: true }), rm(second.root, { recursive: true, force: true })]));
  const a = await inventory([second.root, first.root]);
  const b = await inventory([first.root, second.root]);
  assert.deepEqual(a, b);
});

test("sensitive files outside the allowlist do not affect identity or output", async (t) => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const before = await inventory([f.root]);
  await writeFile(path.join(f.skill, "config.json"), '{"secret":"changed"}\n');
  const after = await inventory([f.root]);
  assert.deepEqual(after, before);
  assert.equal(JSON.stringify(after).includes("do-not-read"), false);
  assert.ok(after.roots[0].excludedPaths.some((entry) => entry.relativePath.endsWith(".env.local")));
});

test("missing roots are incomplete and return non-success state", async (t) => {
  const missing = path.join(await mkdtemp(path.join(tmpdir(), "workflow-audit-missing-")), "missing");
  t.after(() => rm(path.dirname(missing), { recursive: true, force: true }));
  const result = await inventory([missing]);
  assert.equal(result.complete, false);
  assert.equal(result.roots[0].complete, false);
  assert.ok(result.roots[0].errors.length > 0);
});

test("links are skipped and make the root incomplete without following them", async (t) => {
  const f = await fixture();
  const outside = await fixture();
  t.after(() => Promise.all([rm(f.root, { recursive: true, force: true }), rm(outside.root, { recursive: true, force: true })]));
  try {
    await symlink(outside.skill, path.join(f.root, "linked-skill"), "junction");
  } catch (error) {
    t.skip(`junction creation unavailable: ${error.code ?? error.message}`);
    return;
  }
  const result = await inventory([f.root]);
  assert.equal(result.complete, false);
  assert.ok(result.roots[0].skippedLinks.some((entry) => entry.path.endsWith("linked-skill")));
  assert.equal(result.roots[0].skills.some((skill) => skill.name === "linked-skill"), false);
});

test("linked ancestors are rejected before traversal", async (t) => {
  const actual = await fixture();
  const container = await mkdtemp(path.join(tmpdir(), "workflow-audit-parent-"));
  t.after(() => Promise.all([rm(actual.root, { recursive: true, force: true }), rm(container, { recursive: true, force: true })]));
  const linked = path.join(container, "linked-root");
  try {
    await symlink(actual.root, linked, "junction");
  } catch (error) {
    t.skip(`junction creation unavailable: ${error.code ?? error.message}`);
    return;
  }
  // The final root itself is regular; only its parent is linked.
  await mkdir(path.join(actual.root, "nested"));
  await cp(actual.skill, path.join(actual.root, "nested", "alpha"), { recursive: true });
  const result = await inventory([path.join(linked, "nested")]);
  assert.equal(result.complete, false);
  assert.ok(result.roots[0].skippedLinks.some((entry) => entry.type === "ancestor-link"));
  assert.equal(result.roots[0].skills.length, 0);
});

test("non-skill folders are reported as skipped without bodies", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "workflow-audit-malformed-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "empty-skill"));
  await writeFile(path.join(root, "empty-skill", "config.env"), "TOKEN=secret\n");
  const result = await inventory([root]);
  assert.equal(result.complete, true);
  assert.equal(result.roots[0].skills.length, 0);
  assert.ok(result.roots[0].skippedNonSkills.some((entry) => entry.reason === "missing-SKILL.md"));
  assert.equal(JSON.stringify(result).includes("TOKEN=secret"), false);
});

test("unknown or missing CLI arguments fail without inventory", async () => {
  const script = fileURLToPath(new URL("./inventory.mjs", import.meta.url));
  await assert.rejects(execFileAsync(process.execPath, [script, "--bogus"]), (error) => error.code === 1);
  await assert.rejects(execFileAsync(process.execPath, [script, "--root"]), (error) => error.code === 1);
});
