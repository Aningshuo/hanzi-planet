/* 开发用：自动截图与流程自测 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'shots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

ipcMain.handle('data:load', () => null);
ipcMain.handle('data:save', () => true);
ipcMain.handle('data:export', () => true);
ipcMain.handle('data:import', () => null);
ipcMain.handle('data:reset', () => true);
ipcMain.handle('app:info', () => ({ platform: process.platform, version: '1.0.0' }));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(win, name) {
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, name + '.png'), img.toPNG());
  console.log('shot:', name);
}

async function js(win, code) {
  try {
    return await win.webContents.executeJavaScript(code, true);
  } catch (e) {
    console.log('[js error]', e.message);
  }
}

app.disableHardwareAcceleration();

const SEED = `(function(){
  const S = HZ.Store.state;
  const learned = ['一','二','三','四','五','六','七','八','人','大','小','你','我','好','家','日','月','山'];
  learned.forEach(function(ch, i){
    HZ.Store.learnChar(ch);
    S.chars[ch].mastery = 1 + (i % 5);
    S.chars[ch].wrong = i % 3;
    S.chars[ch].nextReview = Date.now() - 1000*60*60*(1 + (i % 6));
  });
  S.stars = 46; S.stats.streak = 4;
  const day = 86400000;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i*day);
    const k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    S.stats.days[k] = { seconds: [0,420,900,300,1200,660,780][6-i], chars: [0,2,3,1,4,2,3][6-i], reviews: [0,0,2,1,3,2,1][6-i] };
  }
  S.stats.totalSeconds = 4260;
  S.stats.writeCount = 9; S.stats.speakCount = 7;
  S.books.b1 = Date.now(); S.stats.booksRead = 1;
  S.counts = { play: 18, recognize: 18, practice: 16, write: 9, speak: 7 };
  S.badges.first = Date.now(); S.badges.ten = Date.now(); S.badges.streak3 = Date.now();
  HZ.App.go('map'); HZ.App.refreshChrome();
})()`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    show: false,
    backgroundColor: '#fff9f1',
    webPreferences: {
      preload: path.join(root, 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (_e, level, msg) => {
    if (level >= 1) console.log('[page]', msg);
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => console.log('[fail]', code, desc));

  await win.loadFile(path.join(root, 'src', 'index.html'));
  await wait(1600);
  await js(win, SEED);
  await js(win, `(function(){ const m=document.querySelector('.modal-mask'); if(m) m.remove(); })()`);
  await wait(600);
  await shot(win, '01-map');

  await js(win, `document.getElementById('view').scrollTop = 380`);
  await wait(400);
  await shot(win, '02-map-scroll');

  await js(win, `HZ.App.go('review')`);
  await wait(500);
  await shot(win, '03-review');

  await js(win, `HZ.App.go('read')`);
  await wait(500);
  await shot(win, '04-read');

  await js(win, `(function(){ document.querySelectorAll('.book-card')[1].click(); })()`);
  await wait(900);
  await shot(win, '05-reader');
  await js(win, `(function(){ const b=document.querySelector('.reader .lesson-close'); if(b) b.click(); })()`);

  await js(win, `HZ.App.go('pinyin')`);
  await wait(500);
  await shot(win, '06-pinyin');

  await js(win, `HZ.App.go('grow')`);
  await wait(500);
  await shot(win, '07-grow');

  await js(win, `HZ.App.go('parent')`);
  await wait(400);
  await shot(win, '08-parent-gate');

  // 通过家长验证
  await js(win, `(function(){
    const q = document.querySelector('.card div[style*="font-size:30px"]').textContent;
    const m = q.match(/(\\d+)\\s*\\+\\s*(\\d+)/);
    const ans = Number(m[1]) + Number(m[2]);
    const btns = [...document.querySelectorAll('.card .btn')];
    const hit = btns.find(b => b.textContent.trim() === String(ans));
    if (hit) hit.click();
  })()`);
  await wait(600);
  await shot(win, '09-parent');
  await js(win, `document.getElementById('view').scrollTop = 700`);
  await wait(400);
  await shot(win, '10-parent-settings');

  // 五步学习
  await js(win, `HZ.App.go('map')`);
  await wait(300);
  await js(win, `HZ.App.startLesson([HZ_DATA.CHARS[17]])`);
  await wait(900);
  await shot(win, '11-lesson-play');

  await js(win, `(async function(){
    const target = HZ_DATA.CHARS[17].ch;
    for (let i=0;i<3;i++){
      const b=[...document.querySelectorAll('.bubble')].find(x=>x.textContent===target);
      if(b) b.click();
      await new Promise(r=>setTimeout(r,800));
    }
  })()`);
  await wait(1400);
  await shot(win, '12-lesson-recognize');

  await js(win, `(function(){ const b=[...document.querySelectorAll('.btn')].find(x=>x.textContent.includes('我记住啦')); if(b) b.click(); })()`);
  await wait(900);
  await shot(win, '13-lesson-practice');

  await js(win, `(async function(){
    for (let i=0;i<3;i++){
      const opts=[...document.querySelectorAll('.option')];
      if(opts.length) opts[Math.floor(Math.random()*opts.length)].click();
      await new Promise(r=>setTimeout(r,1200));
    }
  })()`);
  await wait(2400);
  await shot(win, '14-lesson-write');

  await wait(1800);
  await js(win, `(function(){ const b=[...document.querySelectorAll('.btn')].find(x=>x.textContent.includes('写完啦')); if(b) b.click(); })()`);
  await wait(900);
  await shot(win, '15-lesson-speak');

  await js(win, `(function(){ const b=[...document.querySelectorAll('.btn')].find(x=>x.textContent.includes('我说完啦')); if(b) b.click(); })()`);
  await wait(1200);
  await shot(win, '16-lesson-reward');

  // 单元小测
  await js(win, `HZ.Lesson.close(); HZ.App.startQuiz(1)`);
  await wait(900);
  await shot(win, '17-quiz');

  console.log('learned:', await js(win, `HZ.Store.learnedCount()`));
  console.log('due:', await js(win, `HZ.Store.dueChars().length`));
  console.log('errors:', await js(win, `window.__errs ? window.__errs.length : 0`));
  app.quit();
});
