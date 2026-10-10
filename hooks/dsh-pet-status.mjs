#!/usr/bin/env node
/**
 * cursor-dsh-pet-hooks
 * Mirror Cursor Agent lifecycle onto dsh-pet via localhost HTTP API.
 *
 * Fail-open: never block Cursor if the pet is offline.
 * Chinese strings use \u escapes so the file stays ASCII-safe on Windows.
 *
 * Optional env:
 *   DSH_PET_BASE   e.g. http://127.0.0.1:3080/dsh-pet-7340
 *   DSH_PET_PORT   preferred port when auto-discovering (default tries 3080 first)
 *   DSH_PET_ID     pet id (default: main)
 *   DSH_PET_DEBUG  1 = verbose log
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

const HOOKS_DIR = path.join(os.homedir(), '.cursor', 'hooks');
const PORT_CACHE = path.join(HOOKS_DIR, 'dsh-pet-port.txt');
const THROTTLE_FILE = path.join(HOOKS_DIR, 'dsh-pet-throttle.json');
const DEBUG_LOG = path.join(HOOKS_DIR, 'dsh-pet-status.log');

const PET_ID = process.env.DSH_PET_ID || 'main';
const ENV_BASE = (process.env.DSH_PET_BASE || '').replace(/\/$/, '');
const PREFERRED_PORT = Number(process.env.DSH_PET_PORT || 0) || 0;

const ANIM = {
  thinking: '\u5de5\u4f5c\u72b6\u6001-\u601d\u8003\u5192\u6ce1',
  working: '\u5de5\u4f5c\u72b6\u6001-\u5fd9\u788c\u70b9\u6309',
  result: '\u5de5\u4f5c\u72b6\u6001-\u6e05\u70b9\u5f52\u6863',
  waiting: '\u5de5\u4f5c\u72b6\u6001-\u539f\u5730\u8e09\u6b65\u5f20\u671b',
  success: '\u5de5\u4f5c\u72b6\u6001-\u96c0\u8dc3\u5e86\u795d',
  error: '\u5de5\u4f5c\u72b6\u6001-\u5782\u5934\u53f9\u6c14\u5192\u6c57',
};

const TEXT = {
  startThink: 'Cursor \u5f00\u59cb\u601d\u8003',
  thinking: 'Cursor \u6b63\u5728\u601d\u8003',
  working: 'Cursor \u6b63\u5728\u5e72\u6d3b',
  result: 'Cursor \u6574\u7406\u7ed3\u679c',
  stuck: 'Cursor \u8fd9\u4e00\u6b65\u5361\u4f4f\u4e86',
  answering: 'Cursor \u6b63\u5728\u56de\u7b54',
  waiting: 'Cursor \u7b49\u4f60\u786e\u8ba4',
  done: 'Cursor \u5b8c\u6210\u5566',
  aborted: 'Cursor \u5df2\u4e2d\u65ad',
  errored: 'Cursor \u51fa\u9519\u4e86',
};

function log(msg) {
  try {
    if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true });
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`, 'utf8');
  } catch {
    /* ignore */
  }
}

function readStdinSync() {
  try {
    const buf = fs.readFileSync(0);
    if (!buf || buf.length === 0) return '';
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      return buf.toString('utf16le');
    }
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      const swapped = Buffer.alloc(buf.length - 2);
      for (let i = 2; i + 1 < buf.length; i += 2) {
        swapped[i - 2] = buf[i + 1];
        swapped[i - 1] = buf[i];
      }
      return swapped.toString('utf16le');
    }
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return buf.slice(3).toString('utf8');
    }
    let nulls = 0;
    const sample = Math.min(buf.length, 64);
    for (let i = 1; i < sample; i += 2) if (buf[i] === 0) nulls++;
    if (nulls >= sample / 4) return buf.toString('utf16le');
    return buf.toString('utf8');
  } catch (e) {
    log(`stdin read fail: ${e.message}`);
    return '';
  }
}

function parsePayload(raw) {
  const text = (raw || '').replace(/^\uFEFF/, '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    const event = (text.match(/"hook_event_name"\s*:\s*"([^"]+)"/) || [])[1];
    const status = (text.match(/"status"\s*:\s*"([^"]+)"/) || [])[1];
    log(`JSON parse fail (${e.message}); fallback event=${event || ''}`);
    return { hook_event_name: event, status };
  }
}

function shouldThrottle(key, minMs) {
  const now = Date.now();
  let map = {};
  try {
    if (fs.existsSync(THROTTLE_FILE)) {
      map = JSON.parse(fs.readFileSync(THROTTLE_FILE, 'utf8') || '{}');
    }
  } catch {
    map = {};
  }
  if (map[key] && now - Number(map[key]) < minMs) return true;
  map[key] = now;
  try {
    fs.writeFileSync(THROTTLE_FILE, JSON.stringify(map), 'utf8');
  } catch {
    /* ignore */
  }
  return false;
}

function httpJson(baseUrl, method, apiPath, bodyObj) {
  return new Promise((resolve) => {
    try {
      const u = new URL(baseUrl + apiPath);
      const body = Buffer.from(JSON.stringify(bodyObj), 'utf8');
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'content-length': body.length,
          },
          timeout: 2000,
        },
        (res) => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        },
      );
      req.on('error', (e) => {
        log(`http error ${apiPath}: ${e.message}`);
        resolve(false);
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(body);
      req.end();
    } catch (e) {
      log(`http setup fail: ${e.message}`);
      resolve(false);
    }
  });
}

function probePort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/dsh-pet-7340/state',
        method: 'GET',
        timeout: 800,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function findPetBase() {
  if (ENV_BASE) return ENV_BASE;

  const ports = [];
  if (PREFERRED_PORT) ports.push(PREFERRED_PORT);
  try {
    if (fs.existsSync(PORT_CACHE)) {
      const c = fs.readFileSync(PORT_CACHE, 'utf8').trim();
      if (/^\d+$/.test(c)) ports.push(Number(c));
    }
  } catch {
    /* ignore */
  }
  for (const p of [3080, 4096, 3000, 5173, 8080, 8787]) {
    if (!ports.includes(p)) ports.push(p);
  }
  for (const p of ports) {
    if (await probePort(p)) {
      try {
        if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true });
        fs.writeFileSync(PORT_CACHE, String(p), 'utf8');
      } catch {
        /* ignore */
      }
      return `http://127.0.0.1:${p}/dsh-pet-7340`;
    }
  }
  return null;
}

function mapEvent(event, status) {
  switch (event) {
    // Do NOT map sessionStart: it fires when a chat opens, before any real work.
    case 'beforeSubmitPrompt':
      return { anim: ANIM.thinking, text: TEXT.startThink, key: 'thinking', ms: 2500 };
    case 'afterAgentThought':
      return { anim: ANIM.thinking, text: TEXT.thinking, key: 'thought', ms: 4000 };
    case 'preToolUse':
      return { anim: ANIM.working, text: TEXT.working, key: 'working', ms: 3000 };
    case 'postToolUse':
      return { anim: ANIM.result, text: TEXT.result, key: 'result', ms: 4000 };
    case 'postToolUseFailure':
      return { anim: ANIM.error, text: TEXT.stuck, key: 'error', ms: 2000 };
    case 'afterAgentResponse':
      return { anim: ANIM.result, text: TEXT.answering, key: 'answer', ms: 4000 };
    case 'beforeShellExecution':
    case 'beforeMCPExecution':
      return { anim: ANIM.waiting, text: TEXT.waiting, key: 'waiting', ms: 2000 };
    case 'stop':
      if (status === 'error') {
        return { anim: ANIM.error, text: TEXT.errored, key: 'stop', ms: 1500 };
      }
      if (status === 'aborted') {
        return { anim: ANIM.waiting, text: TEXT.aborted, key: 'stop', ms: 1500 };
      }
      return { anim: ANIM.success, text: TEXT.done, key: 'stop', ms: 1500 };
    default:
      return null;
  }
}

function writeOut(event) {
  if (
    event === 'preToolUse' ||
    event === 'beforeShellExecution' ||
    event === 'beforeMCPExecution' ||
    event === 'beforeReadFile' ||
    event === 'subagentStart'
  ) {
    process.stdout.write('{"permission":"allow"}\n');
    return;
  }
  if (event === 'beforeSubmitPrompt') {
    process.stdout.write('{"continue":true}\n');
    return;
  }
  process.stdout.write('{}\n');
}

async function main() {
  const cliEvent = process.argv[2];
  const raw = readStdinSync();
  const payload = parsePayload(raw);
  const event = payload.hook_event_name || cliEvent || '';
  const status = payload.status || '';
  log(`event=${event} status=${status} stdinLen=${raw.length} pet=${PET_ID}`);

  const mapped = mapEvent(event, status);
  if (mapped) {
    if (shouldThrottle(mapped.key, mapped.ms)) {
      log(`throttled event=${event}`);
    } else {
      const base = await findPetBase();
      if (!base) {
        log('pet base not found');
      } else {
        const q = `?pet=${encodeURIComponent(PET_ID)}`;
        const okAnim = await httpJson(base, 'POST', `/anim${q}`, { name: mapped.anim });
        const okSay = await httpJson(base, 'POST', `/broadcast${q}`, { text: mapped.text });
        log(`sent anim=${mapped.anim} text=${mapped.text} okAnim=${okAnim} okSay=${okSay} base=${base}`);
      }
    }
  }

  writeOut(event);
}

main().catch((e) => {
  log(`fatal: ${e.message}`);
  process.stdout.write('{}\n');
  process.exit(0);
});
