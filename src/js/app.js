/* 应用入口：路由、计时、护眼与时长管理 */
(function () {
  const Store = window.HZ.Store;
  const { SFX, Speech } = window.HZ;
  const { el, toast, modal } = window.HZ.UI;

  let currentView = 'map';
  let accSec = 0;
  let eyeAcc = 0;
  let limitOpen = false;
  let lastTick = Date.now();

  const App = {
    go(view) {
      if (!window.Views[view]) view = 'map';
      currentView = view;
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
      const v = window.Views[view];
      document.getElementById('pageTitle').textContent = v.title;
      const sub = document.getElementById('pageSub');
      sub.textContent = typeof v.sub === 'function' ? v.sub() : (v.sub || '');
      const root = document.getElementById('view');
      root.scrollTop = 0;
      v.render(root);
      SFX.click();
    },

    refreshChrome() {
      const sum = Store.summary();
      document.getElementById('chipStreak').textContent = sum.streak;
      document.getElementById('chipStars').textContent = sum.stars;
      document.getElementById('chipTime').textContent = sum.todayMinutes;
      document.getElementById('avatarBtn').textContent = Store.state.profile.avatar;
      document.getElementById('dueDot').hidden = sum.due === 0;
      const v = window.Views[currentView];
      if (v && typeof v.sub === 'function') document.getElementById('pageSub').textContent = v.sub();
    },

    refresh() {
      this.refreshChrome();
      const root = document.getElementById('view');
      const v = window.Views[currentView];
      if (v) v.render(root);
    },

    startDaily() {
      if (limitOpen) return;
      const n = Store.state.settings.charsPerSession || 3;
      const chars = Store.nextChars(n);
      if (!chars.length) {
        toast('所有字都学过了，去复习中心看看吧', '🎉');
        App.go('review');
        return;
      }
      window.HZ.Lesson.startLesson(chars);
    },

    startLesson(chars) {
      if (limitOpen) return;
      window.HZ.Lesson.startLesson(chars);
    },

    startQuiz(unitId) {
      if (limitOpen) return;
      window.HZ.Lesson.startQuiz(unitId);
    },

    startReview(chars) {
      if (limitOpen) return;
      window.HZ.Lesson.startReview(chars);
    }
  };

  window.HZ.App = App;

  /* ---------- 计时 / 护眼 / 时长 ---------- */
  function showEyeCare() {
    const wrap = el('div', { class: 'eyecare' });
    wrap.innerHTML = `
      <div class="ec-card">
        <div class="ec-ico">🌳</div>
        <h3>让眼睛休息一下</h3>
        <p>看看窗外最远的那棵树，<br>眨眨眼睛，数到 20 再回来。</p>
        <button class="btn btn-primary btn-lg">我看好啦</button>
      </div>`;
    wrap.querySelector('button').addEventListener('click', () => {
      SFX.click();
      wrap.remove();
      eyeAcc = 0;
    });
    document.body.appendChild(wrap);
  }

  function showLimit() {
    if (limitOpen) return;
    limitOpen = true;
    const limit = Store.state.settings.dailyLimitMin;
    const wrap = el('div', { class: 'eyecare', style: { background: 'rgba(50,40,30,.6)' } });
    wrap.innerHTML = `
      <div class="ec-card" style="max-width:520px">
        <div class="ec-ico">🌙</div>
        <h3>今天学得真棒，该休息啦</h3>
        <p>已经学满 ${limit} 分钟了。<br>学过的字会在明天等着你，先去玩一会儿吧。</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-ghost" data-act="parent">家长调整时长</button>
          <button class="btn btn-primary" data-act="ok">好的，明天见</button>
        </div>
      </div>`;
    wrap.querySelector('[data-act="ok"]').addEventListener('click', () => {
      wrap.remove();
      limitOpen = false;
      App.go('map');
      toast('休息一下，明天再来～', '🌙');
      // 关闭后不再累计时长，直到下次启动
      document.body.dataset.rest = '1';
    });
    wrap.querySelector('[data-act="parent"]').addEventListener('click', () => {
      wrap.remove();
      limitOpen = false;
      App.go('parent');
    });
    document.body.appendChild(wrap);
  }

  function tick() {
    const now = Date.now();
    const delta = Math.min(5, Math.round((now - lastTick) / 1000));
    lastTick = now;
    if (document.hidden || document.body.dataset.rest === '1' || limitOpen) return;
    accSec += delta;
    eyeAcc += delta;

    if (accSec >= 10) {
      Store.addSeconds(accSec);
      accSec = 0;
      App.refreshChrome();
    }

    const s = Store.state.settings;
    if (s.eyeCare && eyeAcc >= 15 * 60 && !document.querySelector('.eyecare')) showEyeCare();
    if (s.dailyLimitMin > 0 && Store.todaySeconds() >= s.dailyLimitMin * 60) showLimit();
  }

  /* ---------- 首次启动欢迎 ---------- */
  function welcome() {
    const content = el('div', {});
    content.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:56px">🪐</div>
        <h2 style="margin:8px 0 4px;font-size:22px">欢迎来到汉字星球</h2>
        <p style="margin:0 0 18px;color:#8b7b6c;font-size:13.5px">每天 3 个字，跟着五步慢慢学</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <div style="display:flex;gap:10px;align-items:flex-start;background:#fff8ec;border-radius:14px;padding:12px 14px">
          <span style="font-size:18px">🎮</span><div style="font-size:13px;color:#7b6350;line-height:1.6"><b>玩 → 认 → 练 → 写 → 说</b><br>玩游戏认字形，看字义、做练习、写笔顺、开口说</div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;background:#f2fbff;border-radius:14px;padding:12px 14px">
          <span style="font-size:18px">🔁</span><div style="font-size:13px;color:#3f6c85;line-height:1.6"><b>按记忆曲线复习</b><br>快忘记的时候，学过的字会再出现一次</div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;background:#f4fbf7;border-radius:14px;padding:12px 14px">
          <span style="font-size:18px">📖</span><div style="font-size:13px;color:#2f6b52;line-height:1.6"><b>用学过的字读绘本</b><br>每本只用已学汉字，读到就认得出</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-ghost" data-act="later">先看看</button>
        <button class="btn btn-primary btn-lg" data-act="start">开始第一课</button>
      </div>`;
    const m = modal(content, { dismissible: false });
    content.querySelector('[data-act="later"]').addEventListener('click', () => m.close());
    content.querySelector('[data-act="start"]').addEventListener('click', () => {
      m.close();
      App.startDaily();
    });
  }

  /* ---------- 启动 ---------- */
  async function boot() {
    await Store.load();
    let info = { platform: 'darwin' };
    try {
      if (window.api) info = await window.api.appInfo();
    } catch (e) { /* 预览环境无 IPC */ }
    if (info.platform === 'darwin') document.body.classList.add('mac');

    SFX.setEnabled(Store.state.settings.sfx);
    Speech.setRate(Store.state.settings.ttsRate || 0.8);

    document.querySelectorAll('.nav-item').forEach((b) => {
      b.addEventListener('click', () => App.go(b.dataset.view));
    });

    document.getElementById('soundToggle').addEventListener('click', (e) => {
      const on = !Store.state.settings.sfx;
      Store.state.settings.sfx = on;
      SFX.setEnabled(on);
      e.currentTarget.textContent = on ? '🔊' : '🔇';
      Store.save();
      if (on) SFX.pop();
      toast(on ? '音效已打开' : '音效已关闭', on ? '🔊' : '🔇', 1400);
    });
    document.getElementById('soundToggle').textContent = Store.state.settings.sfx ? '🔊' : '🔇';

    document.getElementById('avatarBtn').addEventListener('click', () => App.go('parent'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.HZ.Lesson.isOpen()) {
        window.HZ.Lesson.close();
        App.refreshChrome();
      }
    });

    App.go('map');
    App.refreshChrome();
    lastTick = Date.now();
    setInterval(tick, 1000);

    if (!Object.keys(Store.state.chars).length && !Store.state.flags.welcomed) {
      Store.state.flags.welcomed = true;
      Store.save();
      setTimeout(welcome, 700);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
