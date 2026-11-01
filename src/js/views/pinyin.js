/* 拼音乐园 */
(function () {
  const { PINYIN_TABLE } = window.HZ_DATA;
  const { el, toast } = window.HZ.UI;
  const { Speech, SFX } = window.HZ;

  const SHENGMU_READ = {
    b: '玻', p: '坡', m: '摸', f: '佛', d: '得', t: '特', n: '讷', l: '勒',
    g: '哥', k: '科', h: '喝', j: '基', q: '欺', x: '希', zh: '知', ch: '吃',
    sh: '诗', r: '日', z: '资', c: '雌', s: '思', y: '衣', w: '乌'
  };

  const YUNMU_READ = {
    a: '啊', o: '哦', e: '鹅', i: '衣', u: '乌', 'ü': '鱼',
    ai: '爱', ei: '诶', ui: '威', ao: '袄', ou: '欧', iu: '优',
    ie: '耶', 'üe': '约', er: '儿', an: '安', en: '恩', in: '因',
    un: '温', 'ün': '晕', ang: '昂', eng: '鞥', ing: '英', ong: '轰'
  };

  const TONE_WORDS = [
    { mark: 'mā', word: '妈', tone: '第一声', tip: '平平的，像小汽车开在平路上' },
    { mark: 'má', word: '麻', tone: '第二声', tip: '往上扬，像上坡' },
    { mark: 'mǎ', word: '马', tone: '第三声', tip: '先降后升，像小山谷' },
    { mark: 'mà', word: '骂', tone: '第四声', tip: '往下落，像下坡' }
  ];

  function tile(main, sub, speakText, extra) {
    const b = el('button', { class: 'py-tile' + (extra || '') });
    b.innerHTML = `<b style="font-size:${main.length > 2 ? 20 : 24}px">${main}</b>${sub ? `<small>${sub}</small>` : ''}`;
    b.addEventListener('click', () => {
      SFX.click();
      Speech.speak(speakText || main, { rate: 0.7 });
    });
    return b;
  }

  function render(root) {
    root.innerHTML = '';

    const hero = el('div', { class: 'review-hero fade-up', style: { background: 'linear-gradient(120deg,#f2ecff,#f7f2ff 60%,#eef8ff)' } });
    hero.innerHTML = `
      <div class="rh-icon">🔤</div>
      <div style="flex:1">
        <h2>拼音是认字的拐杖</h2>
        <p>点一点就能听发音。先熟悉 23 个声母和 24 个韵母，再听听四个声调的不同，拼读就轻松了。</p>
      </div>`;
    root.appendChild(hero);

    const s1 = el('div', { class: 'pinyin-block' });
    s1.appendChild(el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('声母 · 23 个')]), el('span', {}, [document.createTextNode('点一点听读音')])]));
    const g1 = el('div', { class: 'pinyin-grid' });
    PINYIN_TABLE.shengmu.forEach((s) => g1.appendChild(tile(s, SHENGMU_READ[s] || '', SHENGMU_READ[s] || s)));
    s1.appendChild(g1);
    root.appendChild(s1);

    const s2 = el('div', { class: 'pinyin-block' });
    s2.appendChild(el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('韵母 · 24 个')]), el('span', {}, [document.createTextNode('单韵母 + 复韵母 + 鼻韵母')])]));
    const g2 = el('div', { class: 'pinyin-grid' });
    PINYIN_TABLE.yunmu.forEach((y) => g2.appendChild(tile(y, YUNMU_READ[y] || '', YUNMU_READ[y] || y)));
    s2.appendChild(g2);
    root.appendChild(s2);

    const s3 = el('div', { class: 'pinyin-block' });
    s3.appendChild(el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('四个声调')]), el('span', {}, [document.createTextNode('同一个音节，声调不同，意思也不同')])]));
    const g3 = el('div', { class: 'pinyin-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' } });
    TONE_WORDS.forEach((t) => {
      const b = el('button', { class: 'py-tile tone', style: { height: '86px', alignItems: 'flex-start', padding: '12px 16px' } });
      b.innerHTML = `<b>${t.mark}</b><small>${t.tone} · ${t.word}</small>
        <span style="font-size:10.5px;color:#b6a696">${t.tip}</span>`;
      b.addEventListener('click', () => { SFX.click(); Speech.speak(t.word, { rate: 0.62 }); });
      g3.appendChild(b);
    });
    s3.appendChild(g3);
    root.appendChild(s3);

    const tip = el('div', { class: 'card', style: { display: 'flex', gap: '16px', alignItems: 'center', background: 'linear-gradient(120deg,#fff8ec,#fff)' } });
    tip.innerHTML = `<div style="font-size:36px">🎵</div>
      <div><b style="font-size:15px">拼读小口诀</b>
      <p style="margin:4px 0 0;font-size:13px;color:#8b7b6c;line-height:1.7">
        前音轻短后音重，两音相连猛一碰。<br>
        比如 b - ā → bā（八），m - ā → mā（妈）。声调要读准，意思才不会跑掉。
      </p></div>`;
    root.appendChild(tip);
  }

  window.Views = window.Views || {};
  window.Views.pinyin = {
    title: '拼音乐园',
    sub: () => '声母 23 个 · 韵母 24 个 · 四个声调',
    render
  };
})();
