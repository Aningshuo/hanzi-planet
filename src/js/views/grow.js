/* 成长乐园 */
(function () {
  const { BADGES, CHARS, CHAR_MAP } = window.HZ_DATA;
  const { el, toast, confetti } = window.HZ.UI;
  const Store = window.HZ.Store;
  const { SFX, Speech } = window.HZ;

  const PET_STAGES = ['🐣', '🐥', '🐤', '🦉', '🦄'];
  const PET_NAMES = ['蛋宝宝', '小黄鸡', '叽叽鸟', '智慧猫头鹰', '彩虹独角兽'];

  function petStage(level) {
    const i = Math.min(PET_STAGES.length - 1, Math.floor((level - 1) / 2));
    return { icon: PET_STAGES[i], name: PET_NAMES[i] };
  }

  function render(root) {
    const sum = Store.summary();
    const pet = Store.state.pet;
    const st = petStage(pet.level);
    const inLevel = Store.state.stars % 25;
    root.innerHTML = '';

    const top = el('div', { class: 'grow-top fade-up' });

    const petCard = el('div', { class: 'pet-card' });
    petCard.innerHTML = `
      <div class="pet-avatar">${st.icon}</div>
      <div class="pet-info">
        <h2>${st.name} · Lv.${pet.level}</h2>
        <div class="pet-lv">${pet.name} 陪你学习了 ${sum.days} 天，再得 ${25 - inLevel} 颗星星就升级</div>
        <div class="pet-bar"><i style="width:${(inLevel / 25) * 100}%"></i></div>
        <div class="pet-actions"></div>
      </div>`;
    const actions = petCard.querySelector('.pet-actions');
    const feed = el('button', { class: 'btn btn-sm btn-honey', onclick: () => {
      pet.fed += 1;
      SFX.pop();
      confetti(16);
      toast(`${st.name} 吃得饱饱的，谢谢你！`, '🍎');
      const av = petCard.querySelector('.pet-avatar');
      av.style.transform = 'scale(1.18) rotate(6deg)';
      setTimeout(() => { av.style.transform = ''; }, 320);
      Store.save();
    } }, [document.createTextNode('🍎 喂一喂')]);
    const call = el('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
      SFX.click();
      Speech.speak(pet.name + '，我们一起学汉字吧', { rate: 0.85 });
    } }, [document.createTextNode('💬 说句话')]);
    actions.append(feed, call);
    top.appendChild(petCard);

    const stats = el('div', { class: 'stat-cards' });
    [
      { v: sum.stars, l: '累计星星', i: '⭐' },
      { v: sum.streak, l: '连续学习天数', i: '🔥' },
      { v: sum.mastered, l: '已经掌握的字', i: '✅' },
      { v: `${sum.badges}/${sum.badgeTotal}`, l: '获得的勋章', i: '🏅' }
    ].forEach((s) => {
      const c = el('div', { class: 'stat-card' });
      c.innerHTML = `<div class="sv">${s.i} ${s.v}</div><div class="sl">${s.l}</div>`;
      stats.appendChild(c);
    });
    top.appendChild(stats);
    root.appendChild(top);

    const t1 = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('勋章墙')]), el('span', {}, [document.createTextNode(`已点亮 ${sum.badges} / ${sum.badgeTotal}`)])]);
    root.appendChild(t1);
    const grid = el('div', { class: 'badge-grid' });
    BADGES.forEach((b) => {
      const got = !!Store.state.badges[b.id];
      const card = el('div', { class: 'badge' + (got ? '' : ' locked') });
      card.innerHTML = `<div class="bi">${got ? b.icon : '🔒'}</div><b>${b.name}</b><small>${b.desc}</small>`;
      grid.appendChild(card);
    });
    root.appendChild(grid);

    const learned = Object.keys(Store.state.chars)
      .sort((a, b) => Store.state.chars[b].learnedAt - Store.state.chars[a].learnedAt)
      .slice(0, 24)
      .map((ch) => CHAR_MAP[ch])
      .filter(Boolean);

    const t2 = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('最近学会的字')]), el('span', {}, [document.createTextNode('点一点听读音')])]);
    root.appendChild(t2);
    if (!learned.length) {
      const e = el('div', { class: 'empty' });
      e.innerHTML = `<div class="big">🌱</div><b style="font-size:15px">还没有学过的字</b><span style="font-size:13px">去学习地图开始第一课吧</span>`;
      root.appendChild(e);
    } else {
      const wrap = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } });
      learned.forEach((c) => {
        const b = el('button', {
          style: {
            width: '62px', height: '62px', borderRadius: '18px', background: '#fff',
            boxShadow: 'var(--sh-sm)', fontFamily: 'var(--font-hanzi)', fontSize: '30px', color: '#3a2a1c'
          },
          onclick: () => { SFX.click(); Speech.speak(c.ch, { rate: 0.65 }); }
        }, [document.createTextNode(c.ch)]);
        wrap.appendChild(b);
      });
      root.appendChild(wrap);
    }
  }

  window.Views = window.Views || {};
  window.Views.grow = {
    title: '成长乐园',
    sub: () => `星星 ${Store.state.stars} 颗 · 勋章 ${Object.keys(Store.state.badges).length} 枚`,
    render
  };
})();
