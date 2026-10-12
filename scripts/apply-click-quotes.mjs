/**
 * Patch dsh-pet desktop helper: click pet -> random local quote bubble (no LLM).
 * Quotes file: ~/.dsh/dsh-pet/click-quotes.json
 * Re-run after npm update dsh-pet (node_modules overwrite).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.join(
  os.homedir(),
  '.dsh',
  'profiles',
  'web',
  'node_modules',
  'dsh-pet',
  'runtime',
  'electron-helper',
);

const MARK = '/* click-quotes-patch */';

// ASCII-safe source literals (avoid editor/terminal encoding issues)
const DEFAULT_QUOTES = [
  '\u65e9\u4e0a\u597d\uff0c\u4eca\u5929\u4e5f\u8981\u5145\u6ee1\u5e72\u52b2\u54e6~',
  '\u70b9\u6211\u5e72\u561b\uff1f\u597d\u5427\u597d\u5427\uff0c\u6211\u5728\u542c\u54e6\u3002',
  '\u7f16\u7801\u7d2f\u4e86\u5c31\u4f11\u606f\u4e00\u4e0b\uff0c\u8336\u6c34\u51c6\u5907\u597d\u4e86\u3002',
  '\u4e00\u5bf9\u4e00\u7684\u4f60\uff0c\u662f\u6211\u6700\u559c\u6b22\u7684\u6a21\u5f0f\u3002',
  '\u5dee\u9519\u4e0d\u53ef\u6015\uff0c\u6015\u7684\u662f\u4e0d\u6539\u3002',
  '\u5148\u5199\u5bf9\uff0c\u518d\u5199\u5feb\u3002',
  '\u4f60\u4e0d\u662f\u4e00\u4e2a\u4eba\uff0c\u6211\u4e5f\u5728\u3002',
  '\u7761\u4e00\u89c9\uff0c\u6bd4\u590d\u76d8\u66f4\u6709\u6548\u3002',
  '\u5c0f\u6b65\u8dd1\uff0c\u4e5f\u80fd\u8dd1\u5f88\u8fdc\u3002',
  '\u522b\u614c\uff0c\u559d\u53e3\u6c34\uff0c\u518d\u770b\u4e00\u773c\u3002',
  '\u5b8c\u6210\u4e00\u4ef6\u5c0f\u4e8b\uff0c\u4e5f\u503c\u5f97\u5e86\u795d\u3002',
  '\u6211\u4e0d\u4f1a\u5199\u4ee3\u7801\uff0c\u4f46\u4f1a\u966a\u4f60\u3002',
  '\u6709\u4ec0\u4e48\u60f3\u6cd5\uff0c\u8bf4\u7ed9\u6211\u542c\u5427\u3002',
  '\u4eca\u5929\u7684\u4f60\uff0c\u4e5f\u5f88\u68d2\u54e6\u3002',
  '\u5148\u4fdd\u5b58\uff0c\u518d\u52a0\u73ed\u3002',
];

function toUnicodeLiteral(s) {
  return [...s]
    .map((ch) => {
      const cp = ch.codePointAt(0);
      return cp > 0x7f ? '\\u' + cp.toString(16).padStart(4, '0') : ch;
    })
    .join('');
}

function defaultQuotesLiteral() {
  return (
    '[\n' +
    DEFAULT_QUOTES.map((q) => "  '" + toUnicodeLiteral(q) + "',").join('\n') +
    '\n]'
  );
}

function ensureQuotesFile() {
  const dir = path.join(os.homedir(), '.dsh', 'dsh-pet');
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'click-quotes.json');
  fs.writeFileSync(p, JSON.stringify({ quotes: DEFAULT_QUOTES }, null, 2), 'utf8');
  console.log('wrote', p);
}

function patchMain() {
  const p = path.join(root, 'main.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('pet:get-click-quotes')) {
    // Refresh defaults if patch already present
    const re = /const DEFAULT_CLICK_QUOTES = \[[\s\S]*?\];/;
    if (re.test(src)) {
      src = src.replace(re, 'const DEFAULT_CLICK_QUOTES = ' + defaultQuotesLiteral() + ';');
      fs.writeFileSync(p, src, 'utf8');
      console.log('main.js defaults refreshed');
    } else {
      console.log('main.js already patched');
    }
    return;
  }
  const needle = '  createPetWindows();\n\n  //';
  if (!src.includes(needle)) throw new Error('main.js: createPetWindows anchor not found');
  const block =
    '  createPetWindows();\n\n' +
    '  ' +
    MARK +
    '\n' +
    "  const CLICK_QUOTES_PATH = path.join(require('node:os').homedir(), '.dsh', 'dsh-pet', 'click-quotes.json');\n" +
    '  const DEFAULT_CLICK_QUOTES = ' +
    defaultQuotesLiteral() +
    ';\n' +
    '  function loadClickQuotes() {\n' +
    '    try {\n' +
    "      const raw = readFileSync(CLICK_QUOTES_PATH, 'utf8');\n" +
    '      const data = JSON.parse(raw);\n' +
    '      const list = Array.isArray(data) ? data : data && data.quotes;\n' +
    '      if (Array.isArray(list) && list.length) {\n' +
    "        const cleaned = list.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim());\n" +
    '        if (cleaned.length) return cleaned;\n' +
    '      }\n' +
    '    } catch (_) {}\n' +
    '    return DEFAULT_CLICK_QUOTES;\n' +
    '  }\n' +
    "  ipcMain.handle('pet:get-click-quotes', () => loadClickQuotes());\n\n" +
    '  //';
  src = src.replace(needle, block);
  fs.writeFileSync(p, src, 'utf8');
  console.log('patched main.js');
}

function patchPreload() {
  const p = path.join(root, 'preload.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('getClickQuotes')) {
    console.log('preload.js already patched');
    return;
  }
  const needle = `  onDisplays(cb) {
    ipcRenderer.on('pet:displays', (e, geo) => cb(geo));
  },
});`;
  if (!src.includes(needle)) throw new Error('preload.js: onDisplays anchor not found');
  const repl = `  onDisplays(cb) {
    ipcRenderer.on('pet:displays', (e, geo) => cb(geo));
  },
  ${MARK}
  getClickQuotes() {
    return ipcRenderer.invoke('pet:get-click-quotes');
  },
});`;
  src = src.replace(needle, repl);
  fs.writeFileSync(p, src, 'utf8');
  console.log('patched preload.js');
}

function patchEvents() {
  const p = path.join(root, 'events.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('showClickQuote')) {
    console.log('events.js already patched');
    return;
  }
  const needle = 'PetSprite.prototype.showWhisper = function showWhisper(text, image) {';
  if (!src.includes(needle)) throw new Error('events.js: showWhisper anchor not found');
  const block = `${MARK}
// click quote: bubble only (click anim stays in onClick)
PetSprite.prototype.showClickQuote = function showClickQuote(text) {
  if (typeof text !== 'string' || !text.trim()) return;
  this.whisperOn = true;
  this.whisperView = S.whisperBubbleView({ ok: true, text: text.trim(), ts: 0 });
  this.whisperImage = '';
  this.renderBubble();
  if (this.whisperTimer !== null) window.clearTimeout(this.whisperTimer);
  this.whisperTimer = window.setTimeout(() => {
    this.whisperOn = false;
    this.renderBubble();
  }, BUBBLE_DURATION_MS);
};

PetSprite.prototype.maybeShowClickQuote = function maybeShowClickQuote() {
  const bridge = typeof window !== 'undefined' ? window.petBridge : null;
  if (!bridge || typeof bridge.getClickQuotes !== 'function') return;
  Promise.resolve(bridge.getClickQuotes())
    .then((list) => {
      if (!Array.isArray(list) || !list.length) return;
      const text = list[Math.floor(Math.random() * list.length)];
      this.showClickQuote(text);
    })
    .catch(() => {});
};

PetSprite.prototype.showWhisper = function showWhisper(text, image) {`;
  src = src.replace(needle, block);
  fs.writeFileSync(p, src, 'utf8');
  console.log('patched events.js');
}

function patchSprite() {
  const p = path.join(root, 'sprite.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('maybeShowClickQuote')) {
    console.log('sprite.js already patched');
    return;
  }
  const playLine = `    this.playOnce(S.pick(this.animations.clicks));`;
  const onClickIdx = src.indexOf('  onClick() {');
  if (onClickIdx < 0) throw new Error('sprite.js: onClick not found');
  const playIdx = src.indexOf(playLine, onClickIdx);
  if (playIdx < 0) throw new Error('sprite.js: playOnce clicks not found in onClick');
  const insertAt = playIdx + playLine.length;
  src =
    src.slice(0, insertAt) +
    `\n    this.maybeShowClickQuote(); ${MARK}` +
    src.slice(insertAt);
  fs.writeFileSync(p, src, 'utf8');
  console.log('patched sprite.js');
}

ensureQuotesFile();
patchMain();
patchPreload();
patchEvents();
patchSprite();
console.log('done - restart desktop pet to take effect');
