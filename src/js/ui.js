/* 汉字星球 · UI 小工具 */
(function () {
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n, exclude) {
    const pool = arr.filter((x) => x !== exclude);
    return shuffle(pool).slice(0, n);
  }

  function rand(n) { return Math.floor(Math.random() * n); }

  let toastTimer = null;
  function toast(msg, icon, ms) {
    let box = document.getElementById('toast');
    if (!box) {
      box = el('div', { id: 'toast', class: 'toast' });
      document.body.appendChild(box);
    }
    box.innerHTML = `<span class="toast-icon">${icon || '✨'}</span><span>${msg}</span>`;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), ms || 2200);
  }

  function confetti(n) {
    const layer = document.getElementById('confetti');
    if (!layer) return;
    const colors = ['#ff8a5c', '#ffd166', '#6ec6ff', '#9ee493', '#ff9ec7', '#c4a7ff'];
    for (let i = 0; i < (n || 40); i++) {
      const p = el('i', { class: 'confetti-piece' });
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[rand(colors.length)];
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      p.style.width = 6 + Math.random() * 8 + 'px';
      p.style.height = 8 + Math.random() * 12 + 'px';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
      layer.appendChild(p);
      setTimeout(() => p.remove(), 3200);
    }
  }

  function modal(content, opts) {
    const o = opts || {};
    const wrap = el('div', { class: 'modal-mask' + (o.className ? ' ' + o.className : '') });
    const card = el('div', { class: 'modal-card' }, [content]);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = () => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 220);
      if (o.onClose) o.onClose();
    };
    wrap.addEventListener('click', (e) => { if (e.target === wrap && o.dismissible !== false) close(); });
    return { wrap, card, close };
  }

  function stars(n) {
    return '⭐'.repeat(n);
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  window.HZ = window.HZ || {};
  window.HZ.UI = { el, shuffle, sample, rand, toast, confetti, modal, stars, fmtDate };
})();
