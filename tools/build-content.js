/* 构建期内容脚本：
 * 1) 从 hanzi-writer-data 抽取当前字库的笔顺，合并成 src/data/strokes.js
 * 2) 用 pinyin-pro 生成绘本逐字拼音，写入 src/data/book-pinyin.js
 *
 * 用法：node tools/build-content.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadData() {
  const code = fs.readFileSync(path.join(root, 'src/js/data.js'), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window.HZ_DATA;
}

const { CHARS, BOOKS } = loadData();

/* ---------- 1. 笔顺 ---------- */
const dataDir = path.join(root, 'node_modules/hanzi-writer-data');
const strokes = {};
const missing = [];
CHARS.forEach((c) => {
  const file = path.join(dataDir, c.ch + '.json');
  if (fs.existsSync(file)) {
    strokes[c.ch] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    missing.push(c.ch);
  }
});
fs.writeFileSync(path.join(root, 'src/data/strokes.js'), 'window.HZ_STROKES=' + JSON.stringify(strokes) + ';', 'utf8');
console.log(`笔顺：${Object.keys(strokes).length} 字，缺失 ${missing.length ? missing.join('') : '无'}`);

/* ---------- 2. 绘本拼音 ---------- */
let pinyin;
try {
  pinyin = require('pinyin-pro').pinyin;
} catch (e) {
  console.log('未安装 pinyin-pro，跳过绘本拼音生成（npm i -D pinyin-pro）');
  process.exit(0);
}

const out = {};
BOOKS.forEach((b) => {
  out[b.id] = b.pages.map((p) =>
    Array.from(p.t).map((ch) => {
      if (!/[\u4e00-\u9fa5]/.test(ch)) return '';
      const r = pinyin(ch, { type: 'array', toneType: 'symbol' });
      return r[0] || '';
    })
  );
});
fs.writeFileSync(path.join(root, 'src/data/book-pinyin.js'), 'window.HZ_BOOK_PINYIN = ' + JSON.stringify(out) + ';\n', 'utf8');
console.log(`绘本拼音：${BOOKS.length} 本，${BOOKS.reduce((n, b) => n + b.pages.length, 0)} 页`);
