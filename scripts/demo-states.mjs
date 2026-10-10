#!/usr/bin/env node
/** Push all 6 work-status animations to dsh-pet for a quick visual test. */
import http from 'node:http';

const PET = process.env.DSH_PET_ID || 'main';
const PORT = Number(process.env.DSH_PET_PORT || 3080);
const BASE = (process.env.DSH_PET_BASE || `http://127.0.0.1:${PORT}/dsh-pet-7340`).replace(/\/$/, '');

const STATES = [
  { name: '\u5de5\u4f5c\u72b6\u6001-\u601d\u8003\u5192\u6ce1', text: 'Cursor \u5f00\u59cb\u601d\u8003' },
  { name: '\u5de5\u4f5c\u72b6\u6001-\u5fd9\u788c\u70b9\u6309', text: 'Cursor \u6b63\u5728\u5e72\u6d3b' },
  { name: '\u5de5\u4f5c\u72b6\u6001-\u6e05\u70b9\u5f52\u6863', text: 'Cursor \u6574\u7406\u7ed3\u679c' },
  { name: '\u5de5\u4f5c\u72b6\u6001-\u539f\u5730\u8e09\u6b65\u5f20\u671b', text: 'Cursor \u7b49\u4f60\u786e\u8ba4' },
  { name: '\u5de5\u4f5c\u72b6\u6001-\u96c0\u8dc3\u5e86\u795d', text: 'Cursor \u5b8c\u6210\u5566' },
  { name: '\u5de5\u4f5c\u72b6\u6001-\u5782\u5934\u53f9\u6c14\u5192\u6c57', text: 'Cursor \u51fa\u9519\u4e86' },
];

function post(path, obj) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-length': body.length,
        },
        timeout: 3000,
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const q = `?pet=${encodeURIComponent(PET)}`;
console.log(`base=${BASE} pet=${PET}`);
for (const s of STATES) {
  const a = await post(`/anim${q}`, { name: s.name });
  const b = await post(`/broadcast${q}`, { text: s.text });
  console.log(`OK ${s.text}  anim=${a.status} say=${b.status}`);
  await sleep(4000);
}
console.log('DONE');
