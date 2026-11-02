'use strict';

const fs = require('node:fs');
const path = require('node:path');

const READ_TOOLS = new Set(['read', 'read_file', 'file_read', 'readfile']);
const SHELL_TOOLS = new Set(['bash', 'shell', 'powershell', 'PowerShell', 'command', 'terminal']);

function enabled() {
  const disabled = String(process.env.ECC_READ_ROUTER_ENABLED || '').trim().toLowerCase();
  if (['0', 'false', 'off', 'disabled'].includes(disabled)) return false;
  const hooks = String(process.env.ECC_HOOKS_ENABLED || '').trim().toLowerCase();
  return !['0', 'false', 'off', 'disabled'].includes(hooks);
}

function positiveEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function parsePayload(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const tool = String(parsed.tool_name || parsed.tool || parsed.name || '').trim().toLowerCase();
    const input = parsed.tool_input && typeof parsed.tool_input === 'object'
      ? parsed.tool_input
      : parsed.input && typeof parsed.input === 'object'
        ? parsed.input
        : parsed.parameters && typeof parsed.parameters === 'object'
          ? parsed.parameters
          : {};
    return { tool, input, cwd: typeof parsed.cwd === 'string' ? parsed.cwd : null };
  } catch {
    return null;
  }
}

function shellTokens(command) {
  const tokens = [];
  let token = '';
  let quote = '';
  let escaped = false;
  const source = String(command);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      token += char;
      escaped = false;
    } else if (quote) {
      if (char === quote) quote = '';
      else if (quote === '"' && char === '\\' && source[index + 1] === '"') {
        token += source[index + 1];
        index += 1;
      }
      else token += char;
    } else if (char === '"' || char === "'") quote = char;
    else if (/\s/.test(char)) {
      if (token) { tokens.push(token); token = ''; }
    } else token += char;
  }
  if (escaped) token += '\\';
  if (token) tokens.push(token);
  return quote ? null : tokens;
}

function fileStats(filePath, maxLines) {
  let stat;
  try { stat = fs.statSync(filePath); } catch { return null; }
  if (!stat.isFile()) return null;
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(64 * 1024);
    let bytesRead = 0;
    let lines = 0;
    let lastByte = null;
    let capped = false;
    while (bytesRead < Math.max(maxLines * 128, 1024 * 1024)) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, bytesRead);
      if (count === 0) break;
      for (let index = 0; index < count; index += 1) {
        if (buffer[index] === 10) lines += 1;
        lastByte = buffer[index];
        if (lines > maxLines) { capped = true; break; }
      }
      bytesRead += count;
      if (capped) break;
    }
    if (!capped && stat.size > 0 && lastByte !== 10) lines += 1;
    return { bytes: stat.size, lines: capped ? maxLines + 1 : lines };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function fullContextBypass() {
  const requested = String(process.env.ECC_READ_ROUTER_ALLOW_FULL_CONTEXT || '').trim().toLowerCase();
  if (!['1', 'true', 'yes', 'on'].includes(requested)) return false;
  const reason = String(process.env.ECC_READ_ROUTER_FULL_CONTEXT_REASON || '').trim();
  if (!reason) return false;
  process.stderr.write(`[read-routing] full-context bypass: ${reason}\n`);
  return true;
}

function block(filePath, stats, limits, source) {
  const reason = [
    `Blocked ${source} of ${filePath}: ${stats.lines}+ lines or ${stats.bytes} bytes exceeds the bounded-read limits`,
    `(line threshold ${limits.minLines}, byte threshold ${limits.maxBytes}).`,
    'Use the orchestrator bounded-read reference with a concrete question and a bounded worker or deterministic excerpts.',
    'Use a small targeted range for exact edits; for debugging, architecture, security or review, set ECC_READ_ROUTER_ALLOW_FULL_CONTEXT=1 together with ECC_READ_ROUTER_FULL_CONTEXT_REASON.',
  ].join(' ');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

function blockCommand(source) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Blocked ${source}: the command combines shell operations and a potential full-file read. Use a bounded query or a targeted read; for debugging, architecture, security or review, set ECC_READ_ROUTER_ALLOW_FULL_CONTEXT=1 together with ECC_READ_ROUTER_FULL_CONTEXT_REASON.`,
    },
  }));
}

function inspectRead(input, cwd, limits) {
  const rawPath = input.file_path || input.path || input.file;
  if (typeof rawPath !== 'string' || !rawPath.trim()) return;
  const filePath = path.resolve(cwd, rawPath);
  const stats = fileStats(filePath, limits.minLines);
  if (!stats) return;

  const offset = input.offset === undefined ? null : Number(input.offset);
  const limit = input.limit === undefined ? null : Number(input.limit);
  const targeted = Number.isSafeInteger(offset) && offset >= 0
    && Number.isSafeInteger(limit) && limit > 0 && limit <= limits.maxTargetLines;
  if (targeted || !((stats.lines > limits.minLines) || (stats.bytes > limits.maxBytes)) || fullContextBypass()) return;
  block(filePath, stats, limits, 'full-file Read');
}

function inspectShell(input, cwd, limits) {
  const command = input.command || input.cmd || input.shell;
  if (typeof command !== 'string') return;
  if (/[;&><]/.test(command)) {
    const readers = new Set(['cat', 'less', 'more', 'head', 'tail', 'get-content', 'gc', 'type']);
    const hasReader = command.split(/[;&><]/).some(part => {
      const tokens = shellTokens(part.trim());
      const executable = tokens && path.basename(tokens[0] || '').toLowerCase().replace(/\.exe$/, '');
      return readers.has(executable);
    });
    if (hasReader) blockCommand('a compound shell read');
    return;
  }
  const pipeline = command.split('|').map(part => part.trim()).filter(Boolean);
  let filteredPipeline = false;
  let unboundedPipeline = false;
  if (pipeline.length > 1) {
    const filterTokens = shellTokens(pipeline[1]);
    const filter = filterTokens && path.basename(filterTokens[0] || '').toLowerCase().replace(/\.exe$/, '');
    if (pipeline.length !== 2) return;
    if (filter === 'select-string') {
      filteredPipeline = filterTokens.some(token => token.toLowerCase() === '-list');
      unboundedPipeline = !filteredPipeline;
    } else if (filter === 'grep' || filter === 'rg') {
      filteredPipeline = filterTokens.some((token, index) => /^(?:-m|--max-count)$/.test(token) && Number(filterTokens[index + 1]) <= limits.maxTargetLines);
      unboundedPipeline = !filteredPipeline;
    }
    else unboundedPipeline = ['findstr'].includes(filter);
    if (!filteredPipeline && !unboundedPipeline) return;
  }
  const tokens = shellTokens((pipeline[0] || command).trim());
  if (!tokens || tokens.length < 2) return;
  const executable = path.basename(tokens[0]).toLowerCase().replace(/\.exe$/, '');
  if (!['cat', 'less', 'more', 'head', 'tail', 'get-content', 'gc', 'type'].includes(executable)) return;

  let fileToken = tokens[tokens.length - 1];
  let requestedLines = null;
  if (executable === 'head' || executable === 'tail') {
    const flag = tokens.slice(1, -1).join(' ');
    const match = flag.match(/(?:-n\s*)?(\d+)$/);
    requestedLines = match ? Number(match[1]) : 10;
    if (requestedLines <= limits.maxTargetLines) return;
  } else if (executable === 'get-content' || executable === 'gc') {
    const bounded = tokens.slice(1, -1).join(' ').match(/-(?:totalcount|first|tail)\s+(\d+)$/i);
    if (bounded && Number(bounded[1]) <= limits.maxTargetLines) return;
  } else if (tokens.length !== 2) return;

  if (!fileToken || fileToken.startsWith('-')) return;
  const filePath = path.resolve(cwd, fileToken);
  const stats = fileStats(filePath, limits.minLines);
  if (!stats || ((stats.lines <= limits.minLines) && (stats.bytes <= limits.maxBytes))) return;
  if (filteredPipeline) return;
  if (fullContextBypass()) return;
  block(filePath, stats, limits, `${executable} command`);
}

function main() {
  if (!enabled()) return;
  const raw = fs.readFileSync(0, 'utf8');
  const payload = parsePayload(raw);
  if (!payload) return;
  const limits = {
    minLines: positiveEnv('ECC_READ_ROUTER_MIN_LINES', 350),
    maxBytes: positiveEnv('ECC_READ_ROUTER_MAX_BYTES', 50000),
    maxTargetLines: positiveEnv('ECC_READ_ROUTER_MAX_TARGET_LINES', 200),
  };
  const cwd = payload.cwd || (typeof payload.input.cwd === 'string' ? payload.input.cwd : process.cwd());
  const mcpRead = /^mcp__.*__(?:read|read_file|read_text_file|read_multiple_files|get_file|get_content)$/i.test(payload.tool);
  if (READ_TOOLS.has(payload.tool) || mcpRead) inspectRead(payload.input, cwd, limits);
  else if (SHELL_TOOLS.has(payload.tool)) inspectShell(payload.input, cwd, limits);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[read-routing] hook skipped: ${error.message}\n`);
}

