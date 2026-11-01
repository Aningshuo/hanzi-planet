/* 复习中心 */
(function () {
  const { el, toast } = window.HZ.UI;
  const Store = window.HZ.Store;
  const { Speech, SFX } = window.HZ;

  function curveCard() {
    const steps = [
      { d: '第 1 天', t: '学完当天' },
      { d: '+1 天', t: '第一次回看' },
      { d: '+2 天', t: '第二次' },
      { d: '+4 天', t: '第三次' },
      { d: '+7 天', t: '第四次' },
      { d: '+15 天', t: '第五次' },
      { d: '+30 天', t: '长时记忆' }
    ];
    const card = el('div', { class: 'chart-card' });
    card.innerHTML = `<div style="display:flex;align-items:baseline;gap:10px">
        <b style="font-size:16px">记忆曲线复习法</b>
        <span style="font-size:12.5px;color:#b6a696">学过的字会在快要忘记的时候再出现一次</span>
      </div>`;
    const row = el('div', { style: { display: 'flex', gap: '6px', marginTop: '18px', flexWrap: 'wrap' } });
    steps.forEach((s, i) => {
      const item = el('div', { style: { flex: '1 1 90px', minWidth: '90px' } });
      item.innerHTML = `
        <div style="height:6px;border-radius:99px;background:linear-gradient(90deg,#ffd88a,#ff9a5c);opacity:${0.35 + i * 0.1}"></div>
        <div style="margin-top:8px;font-size:12px;font-weight:800;color:#8a5a20">${s.d}</div>
        <div style="font-size:11px;color:#b6a696">${s.t}</div>`;
      row.appendChild(item);
    });
    card.appendChild(row);
    return card;
  }

  function charRow(c) {
    const rec = Store.getChar(c.ch);
    const row = el('div', { class: 'review-item' });
    const dots = el('div', { class: 'mastery' });
    for (let i = 0; i < 5; i++) dots.appendChild(el('i', { class: i < (rec ? rec.mastery : 0) ? 'on' : '' }));
    const last = rec ? window.HZ.UI.fmtDate(rec.lastAt) : '—';
    row.innerHTML = `<div class="rc">${c.ch}</div>
      <div class="ri-main"><b>${c.pinyin}</b>　<span style="color:#8b7b6c;font-weight:500">${c.words.join(' · ')}</span>
        <p>上次复习：${last}　·　错误 ${rec ? rec.wrong : 0} 次</p></div>`;
    row.appendChild(dots);
    const b = el('button', { class: 'btn btn-sm btn-ghost', onclick: () => { SFX.click(); Speech.speak(c.ch, { rate: 0.7 }); } }, [document.createTextNode('🔊')]);
    row.appendChild(b);
    return row;
  }

  function render(root) {
    const due = Store.dueChars();
    const learned = Store.learnedCount();
    root.innerHTML = '';

    const hero = el('div', { class: 'review-hero fade-up' });
    hero.innerHTML = `
      <div class="rh-icon">${due.length ? '🔁' : '🌤️'}</div>
      <div style="flex:1">
        <h2>${due.length ? `有 ${due.length} 个字该复习了` : '今天的复习都完成啦'}</h2>
        <p>${due.length
          ? '这些字到了容易忘记的时间点，花 3 分钟回看一遍，记得更牢。答对后，下次复习的间隔会自动变长。'
          : learned ? '可以去学新字，或者提前复习几个老字，让记忆更牢。' : '先去学习地图认识几个字，之后它们会出现在这里。'}</p>
      </div>`;
    const act = el('div', { style: { display: 'flex', gap: '10px', marginLeft: 'auto' } });
    if (due.length) {
      act.appendChild(el('button', { class: 'btn btn-primary btn-lg', onclick: () => window.HZ.Lesson.startReview(due.slice(0, 12)) }, [document.createTextNode('开始复习')]));
    } else if (learned) {
      act.appendChild(el('button', {
        class: 'btn btn-sky btn-lg',
        onclick: () => {
          const all = Object.keys(Store.state.chars).map((ch) => window.HZ_DATA.CHAR_MAP[ch]).filter(Boolean);
          window.HZ.Lesson.startReview(window.HZ.UI.shuffle(all).slice(0, 5));
        }
      }, [document.createTextNode('提前复习 5 个')]));
    }
    hero.appendChild(act);
    root.appendChild(hero);

    root.appendChild(curveCard());

    if (due.length) {
      const t = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('今天要复习的字')]), el('span', {}, [document.createTextNode('按到期时间排序')])]);
      root.appendChild(t);
      const list = el('div', { class: 'review-list' });
      due.slice(0, 20).forEach((c) => list.appendChild(charRow(c)));
      root.appendChild(list);
    }

    const weak = Store.weakChars(10);
    if (weak.length) {
      const t = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('需要多见面')]), el('span', {}, [document.createTextNode('掌握度较低或做错过的字')])]);
      root.appendChild(t);
      const list = el('div', { class: 'review-list' });
      weak.forEach((c) => list.appendChild(charRow(c)));
      root.appendChild(list);
    }

    if (!due.length && !weak.length) {
      const empty = el('div', { class: 'empty' });
      empty.innerHTML = `<div class="big">🌱</div><b style="font-size:16px">还没有需要复习的字</b>
        <span style="font-size:13px">学完新字后，明天再来这里看看</span>`;
      root.appendChild(empty);
    }
  }

  window.Views = window.Views || {};
  window.Views.review = {
    title: '复习中心',
    sub: () => `待复习 ${Store.dueChars().length} 个 · 已学 ${Store.learnedCount()} 个`,
    render
  };
})();
