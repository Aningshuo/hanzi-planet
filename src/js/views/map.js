/* 学习地图 */
(function () {
  const { UNIT_META, CHARS } = window.HZ_DATA;
  const { el, toast } = window.HZ.UI;
  const Store = window.HZ.Store;

  let activeStage = null;

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了，早点休息哦';
    if (h < 11) return '早上好，小小读书郎';
    if (h < 14) return '中午好，休息一下再学';
    if (h < 18) return '下午好，来认几个新朋友';
    return '晚上好，今天学了什么呀';
  }

  function hero() {
    const sum = Store.summary();
    const next = Store.nextUnit();
    const pct = sum.learned / sum.total;
    const C = 2 * Math.PI * 58;
    const ring = el('div', { class: 'hero-ring' });
    ring.innerHTML = `
      <svg viewBox="0 0 132 132">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffc247"/><stop offset="100%" stop-color="#ff7a4d"/>
          </linearGradient>
        </defs>
        <circle class="ring-bg" cx="66" cy="66" r="58" fill="none" stroke-width="11"/>
        <circle class="ring-fg" cx="66" cy="66" r="58" fill="none" stroke-width="11"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
      </svg>
      <div class="ring-label"><b>${sum.learned}</b><span>/ ${sum.total} 字</span></div>`;

    const startBtn = el('button', { class: 'btn btn-primary btn-lg', onclick: () => window.HZ.App.startDaily() },
      [document.createTextNode(next ? '开始今天的学习' : '复习已学汉字')]);
    const reviewBtn = sum.due > 0
      ? el('button', { class: 'btn btn-ghost btn-lg', onclick: () => window.HZ.App.go('review') },
          [document.createTextNode(`待复习 ${sum.due}`)])
      : null;

    const box = el('div', { class: 'map-hero fade-up' });
    box.innerHTML = `
      <div class="hero-text">
        <div class="hero-kicker">${greeting()}</div>
        <h2>${next ? `下一站：<em>${next.name}</em> · 第 ${next.learned + 1} 个字` : '全部汉字都学过啦，去复习吧'}</h2>
        <p>${next ? `本单元还有 ${next.total - next.learned} 个字没学，每天 3 个字，慢慢来就好。` : `已经认识 ${sum.learned} 个字，掌握 ${sum.mastered} 个。`}</p>
        <div class="hero-actions"></div>
      </div>
      <div class="hero-ring-slot"></div>
      <div class="hero-mascot">🪐</div>`;
    box.querySelector('.hero-actions').append(startBtn);
    if (reviewBtn) box.querySelector('.hero-actions').append(reviewBtn);
    box.querySelector('.hero-ring-slot').replaceWith(ring);
    return box;
  }

  function unitCard(u) {
    const p = Store.unitProgress(u.id);
    const unlocked = Store.isUnitUnlocked(u.id);
    const done = p.complete;
    const current = unlocked && !done && Store.nextUnit() && Store.nextUnit().id === u.id;
    const card = el('div', { class: 'unit-card' + (unlocked ? '' : ' locked') + (done ? ' done' : '') + (current ? ' current' : '') });

    const chars = el('div', { class: 'unit-chars' });
    Store.unitChars(u.id).forEach((c) => {
      const rec = Store.getChar(c.ch);
      const cls = 'unit-char' + (rec ? (rec.mastery >= 3 ? ' master' : ' on') : '');
      const chip = el('button', { class: cls, title: c.pinyin + ' · ' + c.meaning }, [document.createTextNode(c.ch)]);
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!unlocked) { toast('先学完上一个单元才能解锁哦', '🔒'); return; }
        window.HZ.App.startLesson([c]);
      });
      chars.appendChild(chip);
    });

    const badge = done ? '已完成' : unlocked ? `${p.learned}/${p.total}` : '未解锁';
    card.innerHTML = `
      <div class="unit-head">
        <div class="unit-ico">${u.icon}</div>
        <div class="unit-title"><h3>${u.name}</h3><p>${u.sub}</p></div>
        <div class="unit-badge">${badge}</div>
      </div>`;
    card.appendChild(chars);
    const bar = el('div', { class: 'unit-bar' }, [el('i')]);
    bar.querySelector('i').style.width = (p.learned / p.total) * 100 + '%';
    card.appendChild(bar);

    if (done) {
      const quiz = el('button', {
        class: 'btn btn-sm btn-mint',
        style: { marginTop: '14px', width: '100%' },
        onclick: (e) => { e.stopPropagation(); window.HZ.App.startQuiz(u.id); }
      }, [document.createTextNode('单元小测 · 巩固一下')]);
      card.appendChild(quiz);
    } else if (!unlocked) {
      card.appendChild(el('div', { class: 'unit-lock' }, [el('span', {}, [document.createTextNode('学完上一单元解锁')])]));
    }

    card.addEventListener('click', () => {
      if (!unlocked) { toast('先学完上一个单元才能解锁哦', '🔒'); return; }
      const nextChar = Store.unitChars(u.id).find((c) => !Store.isLearned(c.ch));
      if (nextChar) window.HZ.App.startLesson([nextChar]);
      else window.HZ.App.startQuiz(u.id);
    });

    return card;
  }

  function render(root) {
    const sum = Store.summary();
    const next = Store.nextUnit();
    if (!activeStage) activeStage = next ? next.stage : '启蒙';

    root.innerHTML = '';
    root.appendChild(hero());

    const tabs = el('div', { class: 'stage-tabs' });
    window.HZ_DATA.STAGES.forEach((s) => {
      const total = s.units.reduce((n, id) => n + Store.unitProgress(id).total, 0);
      const learned = s.units.reduce((n, id) => n + Store.unitProgress(id).learned, 0);
      const b = el('button', {
        class: 'stage-tab' + (activeStage === s.name ? ' active' : ''),
        onclick: () => { activeStage = s.name; window.HZ.App.go('map'); }
      });
      b.innerHTML = `${s.name}<small>${learned}/${total} 字</small>`;
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    const stage = window.HZ_DATA.STAGES.find((s) => s.name === activeStage);
    const grid = el('div', { class: 'unit-grid' });
    stage.units.forEach((id) => {
      const u = UNIT_META.find((x) => x.id === id);
      grid.appendChild(unitCard(u));
    });
    root.appendChild(grid);

    const tip = el('div', { class: 'card', style: { marginTop: '24px', display: 'flex', gap: '18px', alignItems: 'center', background: 'linear-gradient(120deg,#fff8ec,#fff)' } });
    tip.innerHTML = `
      <div style="font-size:40px">💡</div>
      <div style="flex:1">
        <b style="font-size:15px">每个字都要走完五步：玩 → 认 → 练 → 写 → 说</b>
        <p style="margin:4px 0 0;font-size:13px;color:#8b7b6c;line-height:1.7">
          先玩游戏认识字形，再看字义、做练习、跟着笔顺写一写，最后把字放进词语和句子里说出来。
          每学完 8 个字可以做一次单元小测，复习中心会按记忆曲线提醒你回来看它们。
        </p>
      </div>`;
    root.appendChild(tip);
  }

  window.Views = window.Views || {};
  window.Views.map = {
    title: '学习地图',
    sub: () => {
      const sum = Store.summary();
      return `已认识 ${sum.learned} 个字 · 掌握 ${sum.mastered} 个 · 待复习 ${sum.due} 个`;
    },
    render
  };
})();
