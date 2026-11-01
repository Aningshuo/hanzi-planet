/* 绘本馆 */
(function () {
  const { BOOKS, CHAR_MAP } = window.HZ_DATA;
  const { el, toast, confetti } = window.HZ.UI;
  const Store = window.HZ.Store;
  const { Speech, SFX } = window.HZ;
  const PY = window.HZ_BOOK_PINYIN || {};

  let readerState = null;

  function bookCard(b) {
    const unlocked = Store.isBookUnlocked(b);
    const read = !!Store.state.books[b.id];
    const card = el('div', { class: 'book-card' + (unlocked ? '' : ' locked') + (read ? ' read' : '') });
    const night = b.pages[0].bg === 'night';
    card.innerHTML = `
      <div class="book-cover${night ? ' night' : ''}">
        <span class="lvl">${b.level}</span>
        ${b.cover}
      </div>
      <div class="book-body">
        <h3>${b.title}</h3>
        <p>${unlocked ? `${b.pages.length} 页 · ${read ? '再读一遍' : '用学过的字读故事'}` : `学会 ${b.need} 个字解锁（还差 ${b.need - Store.learnedCount()} 个）`}</p>
      </div>`;
    card.addEventListener('click', () => {
      if (!unlocked) {
        toast(`再学会 ${b.need - Store.learnedCount()} 个字就能读这本书啦`, '🔒');
        return;
      }
      openBook(b);
    });
    return card;
  }

  function render(root) {
    root.innerHTML = '';
    const learned = Store.learnedCount();
    const readCount = Store.state.stats.booksRead;

    const hero = el('div', { class: 'review-hero fade-up', style: { background: 'linear-gradient(120deg,#eafaf3,#f2fbff 60%,#fff8ec)' } });
    hero.innerHTML = `
      <div class="rh-icon">📚</div>
      <div style="flex:1">
        <h2>子集绘本 · 用认识的字读故事</h2>
        <p>每本书只用你已经学过的汉字编写，10 个字就能读一本。读到不认识的字，点一下就能听发音。
          已读 <b>${readCount}</b> 本，认识 <b>${learned}</b> 个字。</p>
      </div>`;
    root.appendChild(hero);

    const t = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('全部绘本')]), el('span', {}, [document.createTextNode('按识字量自动解锁')])]);
    root.appendChild(t);
    const grid = el('div', { class: 'book-grid' });
    BOOKS.forEach((b) => grid.appendChild(bookCard(b)));
    root.appendChild(grid);
  }

  function openBook(b) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.classList.add('open');
    const reader = el('div', { class: 'reader' });
    reader.innerHTML = `
      <div class="reader-top">
        <button class="lesson-close" title="关闭">✕</button>
        <h3>${b.title}</h3>
        <span class="pill pill-mint page-tag">1 / ${b.pages.length}</span>
        <button class="btn btn-sm btn-sky read-btn">🔊 跟我读</button>
      </div>
      <div class="reader-page"></div>
      <div class="reader-foot">
        <button class="btn btn-sm btn-ghost prev-btn">← 上一页</button>
        <div class="reader-dots"></div>
        <button class="btn btn-sm btn-primary next-btn">下一页 →</button>
      </div>`;
    overlay.appendChild(reader);
    readerState = { book: b, page: 0 };

    const pageEl = reader.querySelector('.reader-page');
    const dots = reader.querySelector('.reader-dots');
    b.pages.forEach(() => dots.appendChild(el('i')));

    function draw() {
      const p = b.pages[readerState.page];
      pageEl.className = 'reader-page ' + (p.bg || 'day');
      const pyList = (PY[b.id] && PY[b.id][readerState.page]) || [];
      const chars = Array.from(p.t);
      pageEl.innerHTML = '';
      const art = el('div', { class: 'reader-art' }, [document.createTextNode(p.art)]);
      const text = el('div', { class: 'reader-text' });
      chars.forEach((ch, i) => {
        if (!/[\u4e00-\u9fa5]/.test(ch)) {
          const p = el('span', { class: 'ch punct-ch' });
          p.innerHTML = `<span class="py"></span>${ch}`;
          text.appendChild(p);
          return;
        }
        const s = el('span', { class: 'ch' });
        s.innerHTML = `<span class="py">${pyList[i] || ''}</span>${ch}`;
        s.addEventListener('click', () => {
          SFX.click();
          const info = CHAR_MAP[ch];
          Speech.speak(ch, { rate: 0.65 });
          toast(info ? `${ch} ${info.pinyin} · ${info.meaning}` : `${ch} ${pyList[i] || ''}`, '🔊', 1800);
        });
        text.appendChild(s);
      });
      pageEl.append(art, text);

      reader.querySelector('.page-tag').textContent = `${readerState.page + 1} / ${b.pages.length}`;
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === readerState.page));
      reader.querySelector('.prev-btn').disabled = readerState.page === 0;
      const next = reader.querySelector('.next-btn');
      next.textContent = readerState.page === b.pages.length - 1 ? '读完啦 ✓' : '下一页 →';
      SFX.page();
    }

    function close() {
      Speech.stop();
      overlay.classList.remove('open');
      overlay.innerHTML = '';
      readerState = null;
      document.removeEventListener('keydown', onKey);
      window.HZ.App.refresh();
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') reader.querySelector('.next-btn').click();
      if (e.key === 'ArrowLeft' && readerState && readerState.page > 0) {
        readerState.page -= 1;
        draw();
      }
    }
    document.addEventListener('keydown', onKey);

    reader.querySelector('.lesson-close').addEventListener('click', close);
    reader.querySelector('.prev-btn').addEventListener('click', () => {
      if (readerState.page > 0) { readerState.page -= 1; draw(); }
    });
    reader.querySelector('.next-btn').addEventListener('click', () => {
      if (readerState.page < b.pages.length - 1) {
        readerState.page += 1;
        draw();
      } else {
        const isNew = Store.markBookRead(b.id);
        Store.checkBadges();
        Store.saveNow();
        confetti(36);
        SFX.star();
        toast(isNew ? `读完《${b.title}》，+3 星星` : `又读了一遍《${b.title}》`, '📖', 2400);
        window.HZ.App.refreshChrome();
        close();
      }
    });
    reader.querySelector('.read-btn').addEventListener('click', () => {
      const p = b.pages[readerState.page];
      Speech.speak(p.t, { rate: 0.72 });
    });

    draw();
    setTimeout(() => {
      const p = b.pages[0];
      Speech.speak(p.t, { rate: 0.72 });
    }, 600);
  }

  window.Views = window.Views || {};
  window.Views.read = {
    title: '绘本馆',
    sub: () => `已读 ${Store.state.stats.booksRead} 本 · ${Store.learnedCount()} 个字可以读了`,
    render
  };
})();
