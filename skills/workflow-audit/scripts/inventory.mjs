#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_DIRS = new Set(["references", "scripts", "assets", "agents", "templates", "examples"]);
const ROOT_METADATA = /^(?:LICENSE|NOTICE|SOURCE)(?:$|[.\-_])/i;
const SENSITIVE_NAME = /^(?:config|auth|token|secret|credential|session)|\.(?:pem|key|p12|pfx)$/i;

function normalize(value) {
  return path.resolve(value).replaceAll(path.sep, "/");
}

function isAllowedRootFile(name) {
  return name === "SKILL.md" || ROOT_METADATA.test(name);
}

function isAllowedPath(relativePath) {
  const parts = relativePath.split("/");
  return parts.length === 1 ? isAllowedRootFile(parts[0]) || ALLOWED_DIRS.has(parts[0]) : ALLOWED_DIRS.has(parts[0]);
}

function sensitiveReason(name) {
  if (/^\.env(?:$|[.\-_])/i.test(name)) return "environment-file";
  if (name.startsWith(".")) return "hidden-or-dotfile";
  if (/\.(?:pem|key|p12|pfx)$/i.test(name)) return "credential-key-file";
  return "credential-or-configuration-name";
}

function isSensitiveName(name) {
  return name.startsWith(".") || SENSITIVE_NAME.test(name);
}

async function lstatSafe(target, errors) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    errors.push({ path: normalize(target), error: error.code ?? error.message });
    return null;
  }
}

async function collectFiles(folder, relative = "", skippedLinks = [], excludedPaths = [], errors = []) {
  const entries = [];
  let names;
  try {
    names = await fs.readdir(folder, { withFileTypes: true });
  } catch (error) {
    errors.push({ path: normalize(folder), error: error.code ?? error.message });
    return entries;
  }

  for (const entry of names.sort((a, b) => a.name.localeCompare(b.name))) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (isSensitiveName(entry.name)) {
      excludedPaths.push({ path: normalize(path.join(folder, entry.name)), relativePath: childRelative, reason: sensitiveReason(entry.name) });
      continue;
    }
    if (!isAllowedPath(childRelative)) continue;
    const child = path.join(folder, entry.name);
    const stat = await lstatSafe(child, errors);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      skippedLinks.push({ path: normalize(child), relativePath: childRelative, type: "symlink" });
      continue;
    }
    if (stat.isDirectory()) {
      entries.push(...await collectFiles(child, childRelative, skippedLinks, excludedPaths, errors));
      continue;
    }
    if (!stat.isFile()) {
      errors.push({ path: normalize(child), error: "unsupported-file-type" });
      continue;
    }
    try {
      const bytes = await fs.readFile(child);
      entries.push({ relativePath: childRelative.replaceAll(path.sep, "/"), bytes, size: bytes.length });
    } catch (error) {
      errors.push({ path: normalize(child), error: error.code ?? error.message });
    }
  }
  return entries;
}

function digest(entries) {
  const hash = createHash("sha256");
  for (const entry of entries.toSorted((a, b) => a.relativePath.localeCompare(b.relativePath))) {
    hash.update(entry.relativePath, "utf8");
    hash.update(Buffer.from([0]));
    hash.update(String(entry.size), "utf8");
    hash.update(Buffer.from([0]));
    hash.update(entry.bytes);
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

async function inspectSkill(skillPath, result) {
  const errors = [];
  const skippedLinks = [];
  const excludedPaths = [];
  const stat = await lstatSafe(skillPath, errors);
  if (!stat) return { errors, skippedLinks, excludedPaths };
  if (stat.isSymbolicLink()) {
    skippedLinks.push({ path: normalize(skillPath), relativePath: ".", type: "symlink" });
    return { errors, skippedLinks, excludedPaths };
  }
  if (!stat.isDirectory()) {
    errors.push({ path: normalize(skillPath), error: "skill-folder-not-directory" });
    return { errors, skippedLinks, excludedPaths };
  }
  let entrypointStat;
  try {
    entrypointStat = await fs.lstat(path.join(skillPath, "SKILL.md"));
  } catch (error) {
    if (error.code === "ENOENT") result.skippedNonSkills.push({ path: normalize(skillPath), reason: "missing-SKILL.md" });
    else errors.push({ path: normalize(path.join(skillPath, "SKILL.md")), error: error.code ?? error.message });
    return { errors, skippedLinks, excludedPaths };
  }
  if (!entrypointStat.isFile()) {
    if (entrypointStat.isSymbolicLink()) skippedLinks.push({ path: normalize(path.join(skillPath, "SKILL.md")), relativePath: "SKILL.md", type: "symlink" });
    else errors.push({ path: normalize(path.join(skillPath, "SKILL.md")), error: "SKILL.md-not-regular-file" });
    result.skippedNonSkills.push({ path: normalize(skillPath), reason: "SKILL.md-not-regular-file" });
    return { errors, skippedLinks, excludedPaths };
  }
  const entries = await collectFiles(skillPath, "", skippedLinks, excludedPaths, errors);
  const entrypoint = entries.find((entry) => entry.relativePath === "SKILL.md");
  if (!entrypoint) {
    errors.push({ path: normalize(skillPath), error: "unreadable-or-missing-SKILL.md" });
    return { errors, skippedLinks, excludedPaths };
  }
  return {
    skill: {
      name: path.basename(skillPath),
      path: normalize(skillPath),
      entrypointBytes: entrypoint.size,
      contentSha256: digest(entries),
    },
    errors,
    skippedLinks,
    excludedPaths,
  };
}

async function checkAncestors(root, result) {
  const chain = [];
  let current = normalize(root);
  while (true) {
    chain.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (const ancestor of chain.reverse()) {
    const stat = await lstatSafe(ancestor, result.errors);
    if (stat?.isSymbolicLink()) result.skippedLinks.push({ path: ancestor, relativePath: ".", type: "ancestor-link" });
  }
  return result.errors.length === 0 && result.skippedLinks.length === 0;
}

async function inspectRoot(root) {
  const normalizedRoot = normalize(root);
  const result = { root: normalizedRoot, complete: true, skills: [], skippedNonSkills: [], excludedPaths: [], skippedLinks: [], errors: [] };
  if (!(await checkAncestors(normalizedRoot, result))) {
    result.complete = false;
    return result;
  }
  const rootStat = await lstatSafe(normalizedRoot, result.errors);
  if (!rootStat) {
    result.complete = false;
    return result;
  }
  if (rootStat.isSymbolicLink()) {
    result.skippedLinks.push({ path: normalizedRoot, relativePath: ".", type: "symlink" });
    result.complete = false;
    return result;
  }
  if (!rootStat.isDirectory()) {
    result.errors.push({ path: normalizedRoot, error: "root-not-directory" });
    result.complete = false;
    return result;
  }
  let entries;
  try {
    entries = await fs.readdir(normalizedRoot, { withFileTypes: true });
  } catch (error) {
    result.errors.push({ path: normalizedRoot, error: error.code ?? error.message });
    result.complete = false;
    return result;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(normalizedRoot, entry.name);
    if (isSensitiveName(entry.name)) {
      result.excludedPaths.push({ path: normalize(child), relativePath: entry.name, reason: sensitiveReason(entry.name) });
      continue;
    }
    const stat = await lstatSafe(child, result.errors);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      result.skippedLinks.push({ path: normalize(child), relativePath: entry.name, type: "symlink" });
      continue;
    }
    if (!stat.isDirectory()) continue;
    const inspected = await inspectSkill(child, result);
    result.errors.push(...inspected.errors);
    result.skippedLinks.push(...inspected.skippedLinks);
    result.excludedPaths.push(...inspected.excludedPaths);
    if (inspected.skill) result.skills.push(inspected.skill);
  }
  result.skills.sort((a, b) => a.path.localeCompare(b.path));
  result.skippedNonSkills.sort((a, b) => a.path.localeCompare(b.path));
  result.excludedPaths.sort((a, b) => a.path.localeCompare(b.path));
  result.skippedLinks.sort((a, b) => a.path.localeCompare(b.path));
  result.errors.sort((a, b) => a.path.localeCompare(b.path) || a.error.localeCompare(b.error));
  result.complete = result.errors.length === 0 && result.skippedLinks.length === 0;
  return result;
}

function parseRoots(argv) {
  const roots = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--root") return { error: `unknown-argument:${argv[index]}` };
    if (!argv[index + 1] || argv[index + 1] === "--root") return { error: "missing-root-value" };
    roots.push(argv[++index]);
  }
  if (roots.length === 0) return { error: "missing-root" };
  return { roots: [...new Set(roots.map(normalize))].sort((a, b) => a.localeCompare(b)) };
}

export async function inventory(roots) {
  const normalizedRoots = [...new Set(roots.map(normalize))].sort((a, b) => a.localeCompare(b));
  const rootResults = await Promise.all(normalizedRoots.map(inspectRoot));
  return {
    complete: rootResults.length > 0 && rootResults.every((root) => root.complete),
    roots: rootResults,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const roots = parseRoots(process.argv.slice(2));
  if (roots.error) {
    process.stdout.write(`${JSON.stringify({ complete: false, roots: [], errors: [{ error: roots.error }] })}\n`);
    process.exitCode = 1;
  } else {
    const result = await inventory(roots.roots);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.complete) process.exitCode = 1;
  }
}
