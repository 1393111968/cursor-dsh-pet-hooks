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
  '\u5c4f\u5e55\u518d\u5fd9\uff0c\u4e5f\u522b\u5fd8\u4e86\u6b47\u4e00\u6b47\u773c\u775b\u54e6',
  '\u4eca\u5929\u7684\u96be\u9898\uff0c\u4f1a\u88ab\u8ba4\u771f\u7684\u4f60\u6162\u6162\u89e3\u5f00',
  '\u7d2f\u4e86\u5c31\u9760\u6211\u4e00\u5c0f\u4f1a\u513f\uff0c\u6211\u4e00\u76f4\u966a\u7740\u4f60',
  '\u4e0d\u7528\u903c\u81ea\u5df1\u5168\u901f\u524d\u8fdb\uff0c\u6162\u6162\u6765\u4e5f\u5f88\u68d2',
  '\u6572\u952e\u76d8\u4e45\u5566\uff0c\u8d77\u8eab\u559d\u53e3\u6e29\u6c34\u5427',
  '\u4f60\u7684\u6bcf\u4e00\u4efd\u52aa\u529b\uff0c\u6211\u90fd\u770b\u5728\u773c\u91cc',
  '\u5de5\u4f5c\u5f52\u5de5\u4f5c\uff0c\u5feb\u4e50\u5f52\u4f60\u81ea\u5df1',
  '\u5c31\u7b97\u8fdb\u5ea6\u7f13\u6162\uff0c\u4f60\u4e5f\u5df2\u7ecf\u8d85\u5389\u5bb3\u4e86',
  '\u52a0\u6cb9\uff01\u4e0b\u4e00\u4e2a\u4efb\u52a1\u8f7b\u677e\u641e\u5b9a\uff5e',
  '\u518d\u575a\u6301\u4e00\u5c0f\u6bb5\uff0c\u5c31\u80fd\u4f11\u606f\u5566',
  '\u4f60\u8d85\u9760\u8c31\uff0c\u4ec0\u4e48\u9ebb\u70e6\u90fd\u96be\u4e0d\u5012\u4f60',
  '\u4eca\u65e5\u8fd0\u52bf\uff1a\u5de5\u4f5c\u987a\u5229\uff0c\u70e6\u607c\u9000\u6563',
  '\u6253\u8d77\u7cbe\u795e\uff0c\u597d\u8fd0\u6b63\u5728\u5954\u8d74\u4f60',
  '\u4e13\u6ce8\u5f53\u4e0b\uff0c\u6240\u6709\u4ed8\u51fa\u90fd\u6709\u56de\u62a5',
  '\u7a33\u4f4f\u5fc3\u6001\uff0c\u96be\u9898\u9a6c\u4e0a\u8fce\u5203\u800c\u89e3',
  '\u4e3b\u4eba\u4e0d\u8981\u4e00\u76f4\u76ef\u7740\u7535\u8111\u561b',
  '\u6478\u6211\u4e00\u4e0b\uff0c\u6d88\u9664\u6240\u6709\u75b2\u60eb\uff5e',
  '\u6211\u4e56\u4e56\u8e72\u5728\u8fd9\u91cc\uff0c\u966a\u4f60\u6253\u5de5',
  '\u5de5\u4f5c\u8f9b\u82e6\uff0c\u5956\u52b1\u81ea\u5df1\u7247\u523b\u653e\u677e',
  '\u4e0d\u8bb8\u71ac\u591c\u592a\u4e45\uff0c\u6211\u4f1a\u62c5\u5fc3\u4f60\u7684',
  '\u6709\u6211\u966a\u7740\uff0c\u6253\u5de5\u4e5f\u4e0d\u5b64\u5355\u5566',
  '\u7d2f\u4e86\u5c31\u653e\u7a7a\u4e24\u5206\u949f\uff0c\u6211\u5b88\u7740\u4f60',
  '\u4e0d\u7528\u4e8b\u4e8b\u5b8c\u7f8e\uff0c\u5c3d\u529b\u5c31\u8db3\u591f',
  '\u5141\u8bb8\u81ea\u5df1\u77ed\u6682\u5077\u61d2\uff0c\u4e0d\u5fc5\u7d27\u7ef5',
  '\u70e6\u607c\u5148\u653e\u4e00\u8fb9\uff0c\u5f53\u4e0b\u8f7b\u677e\u6700\u91cd\u8981',
  '\u751f\u6d3b\u4e0d\u6b62\u5de5\u4f5c\uff0c\u8fd8\u6709\u597d\u591a\u5c0f\u7f8e\u597d',
  '\u538b\u529b\u5927\u5c31\u6df1\u547c\u5438\uff0c\u4e00\u5207\u90fd\u4f1a\u8fc7\u53bb',
  '\u4e0d\u5fc5\u8ffd\u8d76\u522b\u4eba\uff0c\u8d70\u597d\u81ea\u5df1\u8282\u594f',
  '\u52b3\u9038\u7ed3\u5408\uff0c\u4e07\u4e8b\u987a\u5fc3',
  '\u597d\u597d\u5de5\u4f5c\uff0c\u597d\u597d\u7231\u81ea\u5df1',
  '\u6b47\u4f1a\u513f\u518d\u7ee7\u7eed\u5427',
  '\u4e07\u4e8b\u7686\u6709\u8f6c\u673a',
  '\u4eca\u65e5\u4e5f\u8981\u5f00\u5fc3',
  '\u591a\u559d\u6c34\uff0c\u5c11\u52b3\u7d2f',
  '\u6211\u6c38\u8fdc\u966a\u4f34\u4f60',
  '\u4ee3\u7801\u603b\u4f1a\u8c03\u901a\uff0c\u8010\u5fc3\u4e00\u70b9\u5c31\u597d',
  '\u62a5\u9519\u522b\u70e6\u8e81\uff0c\u601d\u8def\u7406\u6e05\u5c31\u987a\u7545',
  '\u8c03\u8bd5\u4e45\u4e86\u62ac\u5934\u770b\u770b\u8fdc\u5904',
  '\u903b\u8f91\u7ed5\u6ca1\u5173\u7cfb\uff0c\u6162\u6162\u68b3\u7406\u6e05\u6670',
  '\u5199\u5b8c\u8fd9\u6bb5\u4ee3\u7801\uff0c\u5956\u52b1\u81ea\u5df1\u5c0f\u61a9',
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
