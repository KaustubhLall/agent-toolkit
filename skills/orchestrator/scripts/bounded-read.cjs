'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const DEFAULTS = Object.freeze({
  maxFiles: 8,
  maxPayloadBytes: 120000,
  maxFileBytes: 80000,
  maxLineBytes: 16000,
  maxExcerptLines: 80,
  maxExcerptWindows: 5,
  maxOutputBytes: 24000,
  timeoutMs: 30000,
});

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'from', 'have', 'into', 'that', 'their', 'there',
  'these', 'this', 'those', 'what', 'when', 'where', 'which', 'with', 'would',
]);

function positiveInt(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function questionTerms(question) {
  return [...new Set(
    String(question || '')
      .toLowerCase()
      .match(/[a-z_$][a-z0-9_$-]{2,}/g) || []
  )].filter(term => !STOP_WORDS.has(term));
}

function normalizeLines(text) {
  const lines = String(text).split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function blocksToContent(blocks) {
  return blocks.flatMap(block => [
    `[source lines ${block.start}-${block.end}]`,
    ...block.lines.map(line => `${line.number}: ${line.text}`),
  ]).join('\n');
}

function lineScore(line, terms) {
  const lowered = line.toLowerCase();
  return terms.reduce((score, term) => score + (lowered.includes(term) ? 1 : 0), 0);
}

function excerptBlocksFromLines(lines, terms, options) {
  const maxLines = options.maxExcerptLines;
  const maxWindows = options.maxExcerptWindows;
  const context = 2;
  const scored = [];

  for (let index = 0; index < lines.length; index += 1) {
    const score = terms.length ? lineScore(lines[index], terms) : (index === 0 ? 1 : 0);
    if (score > 0) scored.push({ index, score });
  }

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = scored.slice(0, maxWindows);
  if (chosen.length === 0 && lines.length > 0) chosen.push({ index: 0, score: 0 });

  const ranges = [];
  for (const match of chosen) {
    const start = Math.max(0, match.index - context);
    const end = Math.min(lines.length - 1, match.index + context);
    const previous = ranges[ranges.length - 1];
    if (previous && start <= previous.end + 1) previous.end = Math.max(previous.end, end);
    else ranges.push({ start, end });
  }

  let used = 0;
  return ranges.map(range => {
    const end = Math.min(range.end, range.start + Math.max(0, maxLines - used - 1));
    const block = {
      start: range.start + 1,
      end: end + 1,
      lines: lines.slice(range.start, end + 1).map((text, offset) => ({
        number: range.start + offset + 1,
        text,
      })),
    };
    used += block.lines.length;
    return block;
  }).filter(block => block.lines.length > 0);
}

async function streamLargeFile(filePath, question, options) {
  const lines = [];
  let lineCount = 0;
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const terms = questionTerms(question);
  const candidateLines = [];
  const maxCandidates = Math.max(options.maxExcerptWindows * 4, options.maxExcerptWindows);

  for await (const line of rl) {
    lineCount += 1;
    const score = terms.length ? lineScore(line, terms) : (lineCount === 1 ? 1 : 0);
    if (score > 0) {
      candidateLines.push({ number: lineCount, score });
      candidateLines.sort((a, b) => b.score - a.score || a.number - b.number);
      if (candidateLines.length > maxCandidates) candidateLines.pop();
    }
  }

  candidateLines.sort((a, b) => b.score - a.score || a.number - b.number);
  const chosen = candidateLines.slice(0, options.maxExcerptWindows);
  if (chosen.length === 0 && lineCount > 0) {
    // A second pass is only needed for the bounded first-line fallback.
    chosen.push({ number: 1, score: 0 });
  }

  const ranges = [];
  let usedLines = 0;
  for (const match of chosen) {
    if (usedLines >= options.maxExcerptLines) break;
    const start = Math.max(1, match.number - 2);
    const end = Math.min(lineCount, match.number + 2, start + options.maxExcerptLines - usedLines - 1);
    if (end < start) continue;
    const previous = ranges[ranges.length - 1];
    if (previous && start <= previous.end + 1) previous.end = Math.max(previous.end, end);
    else ranges.push({ start, end });
    usedLines += end - start + 1;
  }

  const wanted = new Set();
  for (const range of ranges) {
    for (let number = range.start; number <= range.end; number += 1) wanted.add(number);
  }

  if (wanted.size > 0) {
    const secondInput = fs.createReadStream(filePath, { encoding: 'utf8' });
    const secondRl = readline.createInterface({ input: secondInput, crlfDelay: Infinity });
    let number = 0;
    for await (const line of secondRl) {
      number += 1;
      if (wanted.has(number)) lines.push({ number, text: line });
    }
  }

  const blocks = ranges.map(range => ({
    start: range.start,
    end: range.end,
    lines: lines.filter(line => line.number >= range.start && line.number <= range.end),
  })).filter(block => block.lines.length > 0);

  return { lineCount, blocks };
}

function readSmallFile(filePath, question, options) {
  const fullContent = fs.readFileSync(filePath, 'utf8');
  const lines = normalizeLines(fullContent);
  const blocks = excerptBlocksFromLines(lines, questionTerms(question), options);
  const content = blocksToContent(blocks);
  return {
    lineCount: lines.length,
    content,
    truncated: content.length < fullContent.length,
    blocks,
  };
}

async function buildPayload(filePath, question, options) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (error) {
    throw new Error(`cannot stat ${filePath}: ${error.message}`);
  }
  if (!stat.isFile()) throw new Error(`not a regular file: ${filePath}`);

  const base = { path: filePath, bytes: stat.size };
  const initialHash = await hashFile(filePath);
  let payload;
  if (stat.size <= options.maxFileBytes) payload = { ...base, ...readSmallFile(filePath, question, options) };
  else {
    if (hasOversizedLine(filePath, options.maxLineBytes)) {
      throw new Error(`refusing ${filePath}: a line exceeds max ${options.maxLineBytes} bytes; use a targeted or bounded shell query`);
    }
    const streamed = await streamLargeFile(filePath, question, options);
    const content = blocksToContent(streamed.blocks);
    payload = { ...base, ...streamed, content, truncated: true };
  }
  payload.sourceHash = await hashFile(filePath);
  if (payload.sourceHash !== initialHash) {
    throw new Error(`source changed while building bounded payload: ${filePath}`);
  }
  return payload;
}

function hasOversizedLine(filePath, maxBytes) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(64 * 1024);
  let offset = 0;
  let lineBytes = 0;
  try {
    while (true) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, offset);
      if (count === 0) return false;
      offset += count;
      for (let index = 0; index < count; index += 1) {
        if (buffer[index] === 10) lineBytes = 0;
        else {
          lineBytes += 1;
          if (lineBytes > maxBytes) return true;
        }
      }
    }
  } finally {
    fs.closeSync(fd);
  }
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const input = fs.createReadStream(filePath);
  for await (const chunk of input) hash.update(chunk);
  return hash.digest('hex');
}

function parseWorkerArgs(raw) {
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('ECC_READ_ROUTER_WORKER_ARGS must be a JSON array'); }
  if (!Array.isArray(parsed) || parsed.some(value => typeof value !== 'string')) {
    throw new Error('ECC_READ_ROUTER_WORKER_ARGS must be a JSON array of strings');
  }
  return parsed;
}

function sensitivePath(filePath) {
  const candidates = [filePath];
  try { candidates.push(fs.realpathSync.native(filePath)); } catch {}
  return candidates.some(candidate => {
    const normalized = candidate.replaceAll('\\', '/');
    const base = path.basename(normalized).toLowerCase();
    return base === '.env'
      || base.startsWith('.env.')
      || /(?:^|\/)\.(?:aws|ssh)(?:\/|$)/i.test(normalized)
      || /(?:^|\/)(?:secret|secrets|credential|credentials)(?:\/|$)/i.test(normalized)
      || /^(?:credentials?|secrets?|token|settings)\.(?:json|ya?ml|yaml|toml|ini)$/i.test(base)
      || /\.(?:pem|key)$/i.test(base);
  });
}

function sensitiveWorkerAllowed() {
  const enabled = String(process.env.ECC_READ_ROUTER_ALLOW_SENSITIVE_WORKER || '').trim().toLowerCase();
  const reason = String(process.env.ECC_READ_ROUTER_SENSITIVE_WORKER_REASON || '').trim();
  return ['1', 'true', 'yes', 'on'].includes(enabled) && reason.length > 0;
}

function parseArgs(argv) {
  const options = {
    question: '',
    paths: [],
    maxFiles: positiveInt(process.env.ECC_READ_ROUTER_MAX_FILES, DEFAULTS.maxFiles, 'max files'),
    maxPayloadBytes: positiveInt(process.env.ECC_READ_ROUTER_MAX_PAYLOAD_BYTES, DEFAULTS.maxPayloadBytes, 'max payload bytes'),
    maxFileBytes: positiveInt(process.env.ECC_READ_ROUTER_MAX_FILE_BYTES, DEFAULTS.maxFileBytes, 'max file bytes'),
    maxLineBytes: positiveInt(process.env.ECC_READ_ROUTER_MAX_LINE_BYTES, DEFAULTS.maxLineBytes, 'max line bytes'),
    maxExcerptLines: positiveInt(process.env.ECC_READ_ROUTER_MAX_EXCERPT_LINES, DEFAULTS.maxExcerptLines, 'max excerpt lines'),
    maxExcerptWindows: positiveInt(process.env.ECC_READ_ROUTER_MAX_EXCERPT_WINDOWS, DEFAULTS.maxExcerptWindows, 'max excerpt windows'),
    maxOutputBytes: positiveInt(process.env.ECC_READ_ROUTER_MAX_OUTPUT_BYTES, DEFAULTS.maxOutputBytes, 'max output bytes'),
    maxTotalExcerptLines: positiveInt(process.env.ECC_READ_ROUTER_MAX_TOTAL_EXCERPT_LINES, DEFAULTS.maxExcerptLines * DEFAULTS.maxExcerptWindows, 'max total excerpt lines'),
    timeoutMs: positiveInt(process.env.ECC_READ_ROUTER_TIMEOUT_MS, DEFAULTS.timeoutMs, 'timeout ms'),
    workerBin: process.env.ECC_READ_ROUTER_WORKER_BIN || '',
    workerArgs: parseWorkerArgs(process.env.ECC_READ_ROUTER_WORKER_ARGS),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) throw new Error(`${arg} requires a value`);
      index += 1;
      return argv[index];
    };
    if (arg === '--question') options.question = value();
    else if (arg === '--paths' || arg === '--path') {
      if (arg === '--path') options.paths.push(value());
      else {
        while (index + 1 < argv.length && !argv[index + 1].startsWith('--')) options.paths.push(argv[++index]);
      }
    } else if (arg === '--worker-bin') options.workerBin = value();
    else if (arg === '--worker-arg') options.workerArgs.push(value());
    else if (arg === '--max-files') options.maxFiles = positiveInt(value(), options.maxFiles, 'max files');
    else if (arg === '--max-payload-bytes') options.maxPayloadBytes = positiveInt(value(), options.maxPayloadBytes, 'max payload bytes');
    else if (arg === '--max-file-bytes') options.maxFileBytes = positiveInt(value(), options.maxFileBytes, 'max file bytes');
    else if (arg === '--max-line-bytes') options.maxLineBytes = positiveInt(value(), options.maxLineBytes, 'max line bytes');
    else if (arg === '--max-excerpt-lines') options.maxExcerptLines = positiveInt(value(), options.maxExcerptLines, 'max excerpt lines');
    else if (arg === '--max-excerpt-windows') options.maxExcerptWindows = positiveInt(value(), options.maxExcerptWindows, 'max excerpt windows');
    else if (arg === '--max-output-bytes') options.maxOutputBytes = positiveInt(value(), options.maxOutputBytes, 'max output bytes');
    else if (arg === '--timeout-ms') options.timeoutMs = positiveInt(value(), options.timeoutMs, 'timeout ms');
    else throw new Error(`unknown argument: ${arg}`);
  }

  if (!options.question.trim()) throw new Error('--question is required');
  if (options.paths.length === 0) throw new Error('--paths is required');
  if (options.paths.length > options.maxFiles) {
    throw new Error(`refusing ${options.paths.length} files; max files is ${options.maxFiles}. Split the request.`);
  }
  return options;
}

async function exactExcerptText(file, start, end) {
  const lines = [];
  const input = fs.createReadStream(file.path, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let number = 0;
  for await (const text of rl) {
    number += 1;
    if (number >= start && number <= end) lines.push({ number, text });
    if (number >= end) {
      rl.close();
      break;
    }
  }
  return lines;
}

function renderBlocks(file, blocks) {
  const output = [];
  for (const block of blocks) {
    output.push(`[${file.path}:${block.start}-${block.end}]`);
    for (const line of block.lines) output.push(`${line.number}: ${line.text}`);
  }
  return output;
}

function renderResult(mode, question, files, answer, extra = []) {
  const lines = [`mode: ${mode}`, `question: ${question}`, 'files:'];
  for (const file of files) {
    lines.push(`- ${file.path} (${file.lineCount} lines, ${file.bytes} bytes${file.truncated ? ', bounded excerpts supplied to worker' : ''})`);
  }
  if (answer) lines.push('', 'answer:', answer.trim());
  lines.push('', 'validated excerpts:');
  for (const file of files) lines.push(...renderBlocks(file, file.renderBlocks || file.blocks));
  lines.push(...extra);
  return `${lines.join('\n')}\n`;
}

async function runWorker(options, payload, files) {
  if (!options.workerBin) return null;
  const result = spawnSync(options.workerBin, options.workerArgs, {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: options.maxOutputBytes,
    windowsHide: true,
    env: {
      PATH: process.env.PATH || '',
      SystemRoot: process.env.SystemRoot || '',
      TEMP: process.env.TEMP || '',
      TMP: process.env.TMP || '',
      ECC_READ_ROUTER_WORKER_REQUEST: '1',
    },
  });
  if (result.error) throw new Error(`worker failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`worker exited ${result.status}: ${(result.stderr || '').trim()}`);
  if (Buffer.byteLength(result.stdout || '', 'utf8') > options.maxOutputBytes) throw new Error('worker output exceeded max output bytes');

  let response;
  try { response = JSON.parse(result.stdout); } catch { throw new Error('worker must return a JSON object'); }
  const answer = response && typeof response.answer === 'string' ? response.answer : '';
  const rawExcerpts = response && Array.isArray(response.excerpts) ? response.excerpts : [];
  if (!answer && rawExcerpts.length === 0) throw new Error('worker returned neither answer nor excerpts');
  const byPath = new Map(files.map(file => [path.resolve(file.path), file]));
  const validated = [];
  let validatedLines = 0;
  for (const excerpt of rawExcerpts.slice(0, options.maxExcerptWindows * files.length)) {
    const target = typeof excerpt?.path === 'string' ? byPath.get(path.resolve(excerpt.path)) : null;
    const start = Number(excerpt?.start_line);
    const end = Number(excerpt?.end_line);
    const span = end - start + 1;
    if (!target || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
      || start < 1 || end < start || end > target.lineCount
      || span > options.maxExcerptLines
      || validatedLines + span > options.maxTotalExcerptLines) continue;
    validated.push({ target, start, end });
    validatedLines += span;
  }
  if (validated.length === 0) throw new Error('worker must return at least one valid source location');
  for (const file of files) {
    if (file.sourceHash !== await hashFile(file.path)) throw new Error(`source changed while worker was running: ${file.path}`);
  }
  for (const file of files) {
    file.renderBlocks = [];
    for (const item of validated) {
      if (item.target !== file) continue;
      file.renderBlocks.push({
        start: item.start,
        end: item.end,
        lines: await exactExcerptText(file, item.start, item.end),
      });
    }
  }
  return answer;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const files = [];
  for (const inputPath of options.paths) {
    const absolute = path.resolve(cwd, inputPath);
    if (options.workerBin && sensitivePath(absolute) && !sensitiveWorkerAllowed()) {
      throw new Error(`refusing to send sensitive path to worker: ${absolute}; use deterministic mode or provide an explicit reviewed override reason`);
    }
    files.push(await buildPayload(absolute, options.question, options));
  }

  for (const file of files) {
    file.renderBlocks = file.blocks;
  }

  const workerPayload = {
    protocol: 1,
    question: options.question,
    files: files.map(file => ({
      path: file.path,
      bytes: file.bytes,
      line_count: file.lineCount,
      truncated: file.truncated,
      content: file.content,
    })),
    limits: {
      max_files: options.maxFiles,
      max_payload_bytes: options.maxPayloadBytes,
      max_output_bytes: options.maxOutputBytes,
    },
  };
  const payloadBytes = Buffer.byteLength(JSON.stringify(workerPayload), 'utf8');
  if (payloadBytes > options.maxPayloadBytes) {
    throw new Error(`bounded payload is ${payloadBytes} bytes, above max ${options.maxPayloadBytes}; split the request or raise the reviewed limit`);
  }
  const answer = await runWorker(options, workerPayload, files);
  const mode = answer === null ? 'deterministic-excerpt' : 'delegated-worker';
  const output = renderResult(
    mode,
    options.question,
    files,
    answer || 'No worker command is configured; use these bounded lexical excerpts, then perform a targeted read for exact edits or reasoning.',
    answer === null ? ['worker: not configured; no external model call was made'] : []
  );
  if (Buffer.byteLength(output, 'utf8') > options.maxOutputBytes) throw new Error('router output exceeded max output bytes');
  process.stdout.write(output);
}

main().catch(error => {
  process.stderr.write(`bounded-read: ${error.message}\n`);
  process.exitCode = 2;
});

