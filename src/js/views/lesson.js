/* 五步学习闭环：玩 → 认 → 练 → 写 → 说 */
(function () {
  const { CHAR_MAP, CHARS, UNIT_META } = window.HZ_DATA;
  const { el, toast, confetti, shuffle, sample } = window.HZ.UI;
  const Store = window.HZ.Store;
  const { SFX, Speech } = window.HZ;

  const STEPS = [
    { key: 'play', name: '玩', icon: '🎮' },
    { key: 'recognize', name: '认', icon: '👀' },
    { key: 'practice', name: '练', icon: '✏️' },
    { key: 'write', name: '写', icon: '🖊️' },
    { key: 'speak', name: '说', icon: '🎤' }
  ];

  let S = null;
  let overlay = null;
  let writer = null;

  function activeSteps() {
    const st = Store.state.settings.steps;
    return STEPS.filter((s) => st[s.key] !== false);
  }

  /* ---------- 会话外壳 ---------- */
  function shell(mode) {
    overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.classList.add('open');
    const box = el('div', { class: 'lesson' });
    box.innerHTML = `
      <div class="lesson-top">
        <button class="lesson-close" title="退出">✕</button>
        <div class="lesson-char-id">
          <span class="mini"></span>
          <div><b class="lc-name"></b><small class="lc-sub"></small></div>
        </div>
        <div class="step-track"></div>
      </div>
      <div class="lesson-stage"></div>`;
    overlay.appendChild(box);
    box.querySelector('.lesson-close').addEventListener('click', () => {
      Speech.stop();
      close();
      if (mode === 'learn') toast('已保存学习进度', '💾');
      window.HZ.App.refresh();
    });
    return box;
  }

  function close() {
    if (writer) { try { writer.cancelQuiz(); } catch (e) {} writer = null; }
    Speech.stop();
    if (overlay) {
      overlay.classList.remove('open');
      overlay.innerHTML = '';
    }
    S = null;
  }

  function track(elTrack, idx) {
    elTrack.innerHTML = '';
    (S.steps || STEPS).forEach((s, i) => {
      const n = el('div', { class: 'step-node' + (i === idx ? ' active' : '') + (i < idx ? ' done' : '') });
      n.innerHTML = `<i>${s.icon}</i>${s.name}`;
      elTrack.appendChild(n);
    });
  }

  function header(box, c, sub) {
    box.querySelector('.mini').textContent = c ? c.ch : '测';
    box.querySelector('.lc-name').textContent = c ? c.pinyin : '单元小测';
    box.querySelector('.lc-sub').textContent = sub || (c ? `${c.stage} · ${c.meaning}` : '');
  }

  /* ---------- 入口 ---------- */
  function startLesson(chars) {
    S = { mode: 'learn', queue: chars.slice(), idx: 0, step: 0, steps: activeSteps(), mistakes: 0 };
    const box = shell('learn');
    S.box = box;
    renderStep();
  }

  function renderStep() {
    const c = S.queue[S.idx];
    const box = S.box;
    header(box, c, `第 ${S.idx + 1}/${S.queue.length} 个字 · ${c.stage}`);
    track(box.querySelector('.step-track'), S.step);
    const stage = box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    const key = S.steps[S.step].key;
    const builder = { play: buildPlay, recognize: buildRecognize, practice: buildPractice, write: buildWrite, speak: buildSpeak }[key];
    stage.appendChild(builder(c, stage));
    if (key === 'recognize') setTimeout(() => Speech.speak(c.ch, { rate: 0.7 }), 320);
  }

  function nextStep() {
    S.step += 1;
    if (S.step >= S.steps.length) {
      finishChar();
    } else {
      renderStep();
    }
  }

  /* ---------- 玩：字宝宝捉迷藏 ---------- */
  function buildPlay(c) {
    const rounds = 3;
    let round = 0;
    const wrap = el('div', { class: 'stage-center' });
    const head = el('div', { class: 'play-head' });
    head.innerHTML = `<h3>字宝宝躲起来了</h3><p>在泡泡里找到 <b style="font-family:var(--font-hanzi);font-size:19px;color:#e2622f">${c.ch}</b>，点一点它</p>`;
    const arena = el('div', { class: 'play-arena' });
    const prog = el('div', { class: 'play-progress' });
    for (let i = 0; i < rounds; i++) prog.appendChild(el('i'));
    wrap.append(head, arena, prog);

    const slots = [[8, 10], [38, 6], [68, 14], [12, 44], [42, 38], [70, 46]];

    function newRound() {
      arena.innerHTML = '';
      prog.querySelectorAll('i').forEach((n, i) => n.classList.toggle('on', i < round));
      if (round >= rounds) { SFX.unlock(); setTimeout(nextStep, 420); return; }
      const pool = sample(CHARS.filter((x) => x.ch !== c.ch), 5);
      const list = shuffle([c].concat(pool));
      const used = shuffle(slots).slice(0, list.length);
      list.forEach((item, i) => {
        const [x, y] = used[i];
        const b = el('button', {
          class: 'bubble',
          style: { left: x + '%', top: y + '%', animationDelay: (i * 0.35) + 's' }
        }, [document.createTextNode(item.ch)]);
        b.addEventListener('click', () => {
          if (item.ch === c.ch) {
            b.classList.add('hit');
            SFX.pop();
            round += 1;
            setTimeout(newRound, 380);
          } else {
            b.classList.add('wrong');
            SFX.wrong();
            setTimeout(() => b.classList.remove('wrong'), 420);
            toast('再看看，找到「' + c.ch + '」哦', '🔍', 1400);
          }
        });
        arena.appendChild(b);
      });
    }

    // 装饰云朵与草地
    for (let i = 0; i < 4; i++) {
      const cl = el('div', { class: 'cloud' });
      cl.style.cssText = `left:${8 + i * 24}%;top:${6 + (i % 3) * 9}%;width:${60 + i * 14}px;height:${20 + i * 4}px;opacity:${0.5 + i * 0.1}`;
      arena.appendChild(cl);
    }
    const ground = el('div', { style: { position: 'absolute', left: 0, right: 0, bottom: '10px', textAlign: 'center', fontSize: '26px', letterSpacing: '18px', opacity: '.75', pointerEvents: 'none' } }, [document.createTextNode('🌷🌿🐞🌿🌼')]);
    arena.appendChild(ground);
    setTimeout(newRound, 120);
    return wrap;
  }

  /* ---------- 认 ---------- */
  function buildRecognize(c) {
    const wrap = el('div', { class: 'stage-center' });
    const grid = el('div', { class: 'recog-wrap' });
    const strokeCount = window.HZ_STROKES[c.ch] ? window.HZ_STROKES[c.ch].strokes.length : '';
    const left = el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' } });
    const tz = el('div', { class: 'tianzige' });
    tz.innerHTML = `<div class="pinyin-top">${c.pinyin}</div><div class="hanzi">${c.ch}</div>
      <button class="tz-speak" title="听读音">🔊</button>`;
    tz.querySelector('.tz-speak').addEventListener('click', () => { SFX.click(); Speech.speak(c.ch, { rate: 0.65 }); });
    left.append(tz);

    const info = el('div', { class: 'recog-info' });
    info.innerHTML = `
      <div class="rt-top">
        <h2>${c.emoji} ${c.meaning}</h2>
        <div class="rt-meta">
          <span class="pill pill-honey">${c.pinyin}</span>
          ${strokeCount ? `<span class="pill">${strokeCount} 画</span>` : ''}
          <span class="pill">${c.stage}</span>
        </div>
      </div>
      <div class="recog-block"><div class="label">组 词</div><div class="word-chips"></div></div>
      <div class="recog-block"><div class="label">例 句</div><div class="sentence-box">${c.sentence.replace(new RegExp(c.ch, 'g'), `<b>${c.ch}</b>`)}</div></div>
      <div class="hint-box"><span class="bulb">💡</span><span>${c.hint}</span></div>`;

    const chips = info.querySelector('.word-chips');
    c.words.forEach((w) => {
      const b = el('button', { class: 'word-chip', onclick: () => { SFX.click(); Speech.speak(w, { rate: 0.75 }); } }, [document.createTextNode(w)]);
      chips.appendChild(b);
    });

    grid.append(left, info);
    const foot = el('div', { style: { display: 'flex', gap: '12px', marginTop: '18px' } }, [
      el('button', { class: 'btn btn-ghost', onclick: () => Speech.speak(c.sentence, { rate: 0.78 }) }, [document.createTextNode('🔊 听例句')]),
      el('button', { class: 'btn btn-primary btn-lg', onclick: () => { SFX.correct(); nextStep(); } }, [document.createTextNode('我记住啦')])
    ]);
    wrap.append(grid, foot);
    return wrap;
  }

  /* ---------- 练 ---------- */
  function optionsFor(c, n) {
    const sameUnit = CHARS.filter((x) => x.unit === c.unit && x.ch !== c.ch);
    const others = CHARS.filter((x) => x.unit !== c.unit && x.ch !== c.ch);
    const pool = sample(sameUnit, n - 1).concat(sample(others, n - 1)).slice(0, n - 1);
    return shuffle([c].concat(pool));
  }

  function makeQuestion(c, type) {
    const opts = optionsFor(c, 4);
    if (type === 'listen') {
      return {
        type,
        char: c,
        title: '听一听，是哪个字？',
        hint: '点喇叭再听一次',
        options: opts,
        speak: c.ch
      };
    }
    if (type === 'fill') {
      const word = (c.words.find((w) => w.includes(c.ch)) || c.ch);
      return {
        type,
        char: c,
        title: '哪个字能填进词语里？',
        word,
        options: opts
      };
    }
    return {
      type: 'meaning',
      char: c,
      title: '这个意思说的是哪个字？',
      emoji: c.emoji,
      meaning: c.meaning,
      options: opts
    };
  }

  function questionView(q, onAnswer) {
    const wrap = el('div', { class: 'quiz-card fade-up' });
    const prompt = el('div', { class: 'quiz-prompt' });
    let head = '';
    if (q.type === 'listen') {
      head = `<div class="q-type">听 音 选 字</div><h3>${q.title}</h3>
        <button class="speaker-btn">🔊</button>`;
    } else if (q.type === 'fill') {
      const blanked = q.word.split('').map((ch) => (ch === q.char.ch ? '<span class="blank">?</span>' : ch)).join('');
      head = `<div class="q-type">看 词 填 字</div><h3>${q.title}</h3><div class="quiz-word" style="margin-top:12px">${blanked}</div>`;
    } else {
      head = `<div class="q-type">看 图 识 字</div><h3>${q.title}</h3>
        <span class="q-emoji">${q.emoji}</span>
        <div style="font-size:14px;color:#8b7b6c">${q.meaning}</div>`;
    }
    prompt.innerHTML = head;
    wrap.appendChild(prompt);

    if (q.type === 'listen') {
      const sp = prompt.querySelector('.speaker-btn');
      sp.addEventListener('click', () => {
        SFX.click();
        sp.classList.add('playing');
        Speech.speak(q.speak, { rate: 0.65 }).then(() => sp.classList.remove('playing'));
      });
      setTimeout(() => {
        sp.classList.add('playing');
        Speech.speak(q.speak, { rate: 0.65 }).then(() => sp.classList.remove('playing'));
      }, 380);
    }

    const grid = el('div', { class: 'options' });
    let locked = false;
    q.options.forEach((o) => {
      const b = el('button', { class: 'option' }, [document.createTextNode(o.ch)]);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        const ok = o.ch === q.char.ch;
        if (ok) {
          b.classList.add('correct');
          SFX.correct();
        } else {
          b.classList.add('wrong');
          SFX.wrong();
          grid.querySelectorAll('.option').forEach((n) => {
            if (n.textContent === q.char.ch) n.classList.add('correct');
            else n.classList.add('dim');
          });
        }
        setTimeout(() => onAnswer(ok), 760);
      });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    const foot = el('div', { class: 'quiz-foot' });
    foot.innerHTML = `<span class="quiz-tip">${q.type === 'listen' ? '听清楚声调，再选字' : '想一想，再点一点'}</span>`;
    wrap.appendChild(foot);
    return wrap;
  }

  function buildPractice(c) {
    const types = shuffle(['listen', 'fill', 'meaning']);
    let i = 0;
    let wrong = 0;
    const wrap = el('div', { class: 'stage-center' });

    function nextQ() {
      if (i >= types.length) {
        SFX.star();
        toast(wrong === 0 ? '三题全对，太棒了！' : '练习完成，继续加油', wrong === 0 ? '🌟' : '👍');
        setTimeout(nextStep, 620);
        return;
      }
      wrap.innerHTML = '';
      const q = makeQuestion(c, types[i]);
      wrap.appendChild(questionView(q, (ok) => {
        if (!ok) { wrong += 1; S.mistakes += 1; }
        i += 1;
        nextQ();
      }));
    }
    nextQ();
    return wrap;
  }

  /* ---------- 写 ---------- */
  function buildWrite(c) {
    const data = window.HZ_STROKES[c.ch];
    const strokes = data ? data.strokes.length : '—';
    const wrap = el('div', { class: 'stage-center' });
    const board = el('div', { class: 'write-board' });
    const host = el('div', { class: 'hw-host' });
    board.appendChild(host);

    const meta = el('div', { class: 'write-meta' });
    meta.innerHTML = `<span>笔画：<b>${strokes}</b> 画</span><span>拼音：<b>${c.pinyin}</b></span><span class="w-state">先看一遍笔顺，再描一描</span>`;

    const tools = el('div', { class: 'write-tools' });
    const demoBtn = el('button', { class: 'btn btn-sky', onclick: () => {
      SFX.click();
      if (!writer) return;
      writer.cancelQuiz();
      writer.showOutline();
      writer.animateCharacter();
      meta.querySelector('.w-state').textContent = '看清楚每一笔从哪里起笔';
    } }, [document.createTextNode('▶ 看笔顺')]);
    const drawBtn = el('button', { class: 'btn btn-honey', onclick: () => {
      SFX.click();
      if (!writer) return;
      startQuiz();
    } }, [document.createTextNode('✍️ 我来写')]);
    const clearBtn = el('button', { class: 'btn btn-ghost btn-sm', onclick: () => {
      if (!writer) return;
      writer.cancelQuiz();
      writer.hideCharacter();
      writer.showOutline();
      meta.querySelector('.w-state').textContent = '点「我来写」重新描一遍';
    } }, [document.createTextNode('重来')]);
    tools.append(demoBtn, drawBtn, clearBtn);

    const foot = el('button', {
      class: 'btn btn-primary btn-lg',
      style: { marginTop: '4px' },
      onclick: () => { SFX.correct(); nextStep(); }
    }, [document.createTextNode('写完啦，下一步')]);

    wrap.append(meta, board, tools, foot);

    setTimeout(() => {
      if (!window.HanziWriter || !data) {
        board.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-family:var(--font-hanzi);font-size:150px;color:#3a2a1c">' + c.ch + '</div>';
        meta.querySelector('.w-state').textContent = '笔顺数据加载中…';
        return;
      }
      writer = window.HanziWriter.create(host, c.ch, {
        width: 352,
        height: 352,
        padding: 18,
        showOutline: true,
        showCharacter: false,
        strokeColor: '#4a3527',
        radicalColor: '#4a3527',
        highlightColor: '#ffb03a',
        outlineColor: '#f2e0ca',
        drawingColor: '#ff7a4d',
        drawingWidth: 28,
        strokeAnimationSpeed: 0.85,
        delayBetweenStrokes: 180,
        charDataLoader: (ch, onComplete) => onComplete(window.HZ_STROKES[ch])
      });
      writer.animateCharacter({
        onComplete: () => {
          writer.showOutline();
          meta.querySelector('.w-state').textContent = '看完了，点「我来写」跟着描一遍';
        }
      });
    }, 60);

    function startQuiz() {
      if (!writer) return;
      writer.cancelQuiz();
      writer.hideCharacter();
      writer.showOutline();
      let mistakes = 0;
      writer.quiz({
        onMistake: () => { mistakes += 1; SFX.wrong(); },
        onComplete: (res) => {
          const total = (res && res.totalMistakes) || mistakes;
          Store.state.stats.writeCount += 1;
          Store.save();
          if (total === 0) {
            SFX.star();
            meta.querySelector('.w-state').textContent = '✅ 笔顺全对，写得真棒！';
            toast('笔顺全对，太厉害了', '🌟');
          } else {
            SFX.correct();
            meta.querySelector('.w-state').textContent = `写了 ${strokes} 画，错了 ${total} 次，再试一次会更棒`;
          }
        }
      });
    }

    return wrap;
  }

  /* ---------- 说 ---------- */
  function buildSpeak(c) {
    const wrap = el('div', { class: 'stage-center' });
    const rows = [
      { lv: '字', text: c.ch, py: c.pinyin },
      { lv: '词', text: c.words[0], py: '' },
      { lv: '词', text: c.words[1] || c.words[0], py: '' },
      { lv: '句', text: c.sentence, py: '', small: true }
    ];
    const ladder = el('div', { class: 'speak-ladder' });
    rows.forEach((r) => {
      const row = el('div', { class: 'speak-row' });
      row.innerHTML = `<div class="speak-lv">${r.lv}</div>
        <div class="speak-text${r.small ? ' small' : ''}">${r.text}${r.py ? `<span class="py">${r.py}</span>` : ''}</div>`;
      const b = el('button', { class: 'speak-play', onclick: () => { SFX.click(); Speech.speak(r.text, { rate: 0.72 }); } }, [document.createTextNode('🔊')]);
      row.appendChild(b);
      ladder.appendChild(row);
    });

    const micZone = el('div', { class: 'mic-zone' });
    const micBtn = el('button', { class: 'mic-btn', title: '按住跟我读' }, [document.createTextNode('🎤')]);
    const micHint = el('div', { class: 'mic-hint', html: '点一下话筒，跟着读一读<br><span style="color:#b6a696;font-size:12px">会录下你的声音，放给你自己听</span>' });
    micZone.append(micBtn, micHint);

    let recorder = null;
    let chunks = [];
    micBtn.addEventListener('click', async () => {
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          micBtn.classList.remove('rec');
          micHint.innerHTML = '听听你刚才读的～ <span style="color:#3ecfa0">（再点话筒可以重录）</span>';
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play();
          Store.state.stats.speakCount += 1;
          Store.save();
        };
        recorder.start();
        micBtn.classList.add('rec');
        micHint.textContent = '正在录音… 读完再点一下话筒';
        setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 5000);
      } catch (e) {
        micHint.innerHTML = '没有麦克风也没关系，<br>大声跟着读三遍就好～';
        Store.state.stats.speakCount += 1;
        Store.save();
      }
    });

    const foot = el('button', { class: 'btn btn-primary btn-lg', style: { marginTop: '14px' }, onclick: () => { SFX.correct(); nextStep(); } }, [document.createTextNode('我说完啦')]);
    wrap.append(ladder, micZone, foot);
    setTimeout(() => Speech.speak(c.ch, { rate: 0.7 }), 300);
    return wrap;
  }

  /* ---------- 单字完成 ---------- */
  function finishChar() {
    const c = S.queue[S.idx];
    const rec = Store.learnChar(c.ch);
    Store.state.counts.play += 1;
    Store.state.counts.recognize += 1;
    Store.state.counts.practice += 1;
    if (S.steps.some((s) => s.key === 'write')) Store.state.counts.write += 1;
    if (S.steps.some((s) => s.key === 'speak')) Store.state.counts.speak += 1;
    const gain = 3;
    Store.addStars(gain);
    const newBadges = Store.checkBadges();
    Store.saveNow();
    window.HZ.App.refreshChrome();

    const stage = S.box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    const isLast = S.idx >= S.queue.length - 1;
    const box = el('div', { class: 'reward fade-up' });
    box.innerHTML = `
      <div class="big-char">${c.ch}</div>
      <div class="reward-stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
      <h2>学会「${c.ch}」啦！</h2>
      <p>${c.pinyin} · ${c.meaning}　·　${rec.mastery >= 3 ? '已经很熟练了' : '明天记得回来复习哦'}</p>
      <div class="reward-actions"></div>`;
    const actions = box.querySelector('.reward-actions');
    if (!isLast) {
      actions.appendChild(el('button', { class: 'btn btn-primary btn-lg', onclick: () => { SFX.click(); S.idx += 1; S.step = 0; renderStep(); } },
        [document.createTextNode(`学下一个字（还有 ${S.queue.length - S.idx - 1} 个）`)]));
    }
    actions.appendChild(el('button', {
      class: 'btn ' + (isLast ? 'btn-primary btn-lg' : 'btn-ghost'),
      onclick: () => {
        close();
        window.HZ.App.go('map');
        toast('今天的字都学完啦，真棒！', '🎉');
      }
    }, [document.createTextNode(isLast ? '回到学习地图' : '先回地图')]));
    stage.appendChild(box);
    track(S.box.querySelector('.step-track'), S.steps.length);
    SFX.star();
    confetti(46);
    if (newBadges.length) {
      setTimeout(() => {
        toast(`解锁勋章：${newBadges.map((b) => b.name).join('、')}`, newBadges[0].icon, 2800);
      }, 800);
    }
  }

  /* ---------- 单元小测 ---------- */
  function startQuiz(unitId) {
    const list = Store.unitChars(unitId);
    const unit = UNIT_META.find((u) => u.id === unitId);
    S = { mode: 'quiz', queue: list, idx: 0, score: 0, total: list.length, steps: [] };
    const box = shell('quiz');
    S.box = box;
    header(box, null, `${unit.name} · 单元小测`);
    track(box.querySelector('.step-track'), 0);
    box.querySelector('.step-track').innerHTML = `<div class="step-node active"><i>🎯</i>单元小测</div>`;
    nextQuiz();
  }

  function nextQuiz() {
    const stage = S.box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    if (S.idx >= S.queue.length) return quizResult();
    const c = S.queue[S.idx];
    header(S.box, null, `第 ${S.idx + 1} / ${S.queue.length} 题 · 已答对 ${S.score} 题`);
    S.box.querySelector('.lc-name').textContent = '单元小测';
    const type = ['listen', 'fill', 'meaning'][S.idx % 3];
    const q = makeQuestion(c, type);
    stage.appendChild(questionView(q, (ok) => {
      if (ok) { S.score += 1; }
      S.idx += 1;
      setTimeout(nextQuiz, 260);
    }));
  }

  function quizResult() {
    const stage = S.box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    const perfect = S.score === S.queue.length;
    if (perfect) Store.state.flags.perfectQuiz = true;
    const stars = Math.max(1, Math.round((S.score / S.queue.length) * 5));
    Store.addStars(stars);
    Store.state.units[S.queue[0].unit] = { score: S.score, total: S.queue.length, at: Date.now() };
    Store.checkBadges();
    Store.saveNow();
    window.HZ.App.refreshChrome();

    const box = el('div', { class: 'reward fade-up' });
    box.innerHTML = `
      <div style="font-size:74px">${perfect ? '🏆' : S.score >= S.queue.length * 0.75 ? '🎉' : '💪'}</div>
      <h2>${perfect ? '全对！满星通过' : `答对 ${S.score} / ${S.queue.length} 题`}</h2>
      <p>${perfect ? '这一单元的字你都认得很牢' : '错过的字会进入复习中心，多见面就记住啦'}</p>
      <div class="reward-stars">${'⭐'.repeat(Math.min(5, stars))}</div>
      <div class="reward-actions"></div>`;
    const actions = box.querySelector('.reward-actions');
    actions.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => { close(); window.HZ.App.go('review'); } }, [document.createTextNode('去复习中心')]));
    actions.appendChild(el('button', { class: 'btn btn-primary btn-lg', onclick: () => { close(); window.HZ.App.go('map'); } }, [document.createTextNode('回到地图')]));
    stage.appendChild(box);
    SFX.star();
    confetti(perfect ? 70 : 36);
  }

  /* ---------- 复习会话 ---------- */
  function startReview(chars) {
    S = { mode: 'review', queue: chars.slice(), idx: 0, score: 0, total: chars.length, steps: [], perChar: 0, charWrong: 0 };
    const box = shell('review');
    S.box = box;
    header(box, null, '复习中心 · 记忆曲线');
    box.querySelector('.step-track').innerHTML = `<div class="step-node active"><i>🔁</i>复习</div>`;
    nextReview();
  }

  function nextReview() {
    const stage = S.box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    if (S.idx >= S.queue.length) return reviewResult();
    const c = S.queue[S.idx];
    header(S.box, null, `第 ${S.idx + 1} / ${S.queue.length} 个字 · 已答对 ${S.score} 题`);
    S.box.querySelector('.lc-name').textContent = '复习';
    const type = S.perChar === 0 ? 'listen' : 'fill';
    const q = makeQuestion(c, type);
    stage.appendChild(questionView(q, (ok) => {
      if (ok) S.score += 1;
      else S.charWrong += 1;
      S.perChar += 1;
      if (S.perChar >= 2) {
        Store.reviewChar(c.ch, S.charWrong === 0);
        S.perChar = 0;
        S.charWrong = 0;
        S.idx += 1;
        Store.addStars(1);
        setTimeout(nextReview, 260);
      } else {
        setTimeout(nextReview, 260);
      }
    }));
  }

  function reviewResult() {
    const stage = S.box.querySelector('.lesson-stage');
    stage.innerHTML = '';
    Store.saveNow();
    window.HZ.App.refreshChrome();
    const box = el('div', { class: 'reward fade-up' });
    box.innerHTML = `
      <div style="font-size:74px">🌱</div>
      <h2>复习完成</h2>
      <p>答对 ${S.score} / ${S.total * 2} 题，这些字会在更长的时间后再来找你</p>
      <div class="reward-stars">⭐</div>
      <div class="reward-actions"></div>`;
    const actions = box.querySelector('.reward-actions');
    actions.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => { close(); window.HZ.App.go('map'); } }, [document.createTextNode('回地图')]));
    actions.appendChild(el('button', { class: 'btn btn-primary btn-lg', onclick: () => { close(); window.HZ.App.go('review'); } }, [document.createTextNode('再看复习计划')]));
    stage.appendChild(box);
    SFX.star();
    confetti(30);
  }

  window.HZ.Lesson = { startLesson, startQuiz, startReview, close, isOpen: () => !!S };
})();
