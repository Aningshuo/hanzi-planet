/* 家长中心 */
(function () {
  const { el, toast, modal, shuffle } = window.HZ.UI;
  const Store = window.HZ.Store;
  const { SFX, Speech } = window.HZ;

  let verified = false;

  function gate(root) {
    const a = 3 + Math.floor(Math.random() * 6);
    const b = 4 + Math.floor(Math.random() * 7);
    const answer = a + b;
    const opts = shuffle([answer, answer + 2, answer - 3, answer + 5]);
    const box = el('div', { class: 'card', style: { maxWidth: '520px', margin: '60px auto', textAlign: 'center', padding: '40px' } });
    box.innerHTML = `
      <div style="font-size:46px">🔐</div>
      <h2 style="margin:10px 0 6px;font-size:20px">家长验证</h2>
      <p style="margin:0 0 20px;color:#8b7b6c;font-size:13.5px">这里是给家长看的页面，请回答一道小算术题</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:2px;margin-bottom:18px">${a} + ${b} = ?</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"></div>`;
    const row = box.querySelector('div:last-child');
    opts.forEach((n) => {
      const btn = el('button', { class: 'btn btn-ghost', style: { minWidth: '76px' }, onclick: () => {
        if (n === answer) {
          verified = true;
          SFX.correct();
          render(root);
        } else {
          SFX.wrong();
          toast('答案不对，请再算一次', '🙂');
        }
      } }, [document.createTextNode(String(n))]);
      row.appendChild(btn);
    });
    root.innerHTML = '';
    root.appendChild(box);
  }

  function reportCards(sum) {
    const grid = el('div', { class: 'report-grid' });
    [
      { v: sum.learned, u: '字', l: '已认汉字', c: '#e2622f' },
      { v: sum.mastered, u: '字', l: '掌握（复习 3 次以上）', c: '#12946c' },
      { v: sum.days, u: '天', l: '有效学习天数', c: '#2b82c9' },
      { v: sum.totalMinutes, u: '分钟', l: '累计学习时长', c: '#b57d05' }
    ].forEach((x) => {
      const c = el('div', { class: 'report-card' });
      c.innerHTML = `<div class="rv" style="color:${x.c}">${x.v}<small>${x.u}</small></div><div class="rl">${x.l}</div>`;
      grid.appendChild(c);
    });
    return grid;
  }

  function weekChart() {
    const data = Store.weekSeries();
    const max = Math.max(10, ...data.map((d) => d.minutes));
    const card = el('div', { class: 'chart-card' });
    card.innerHTML = `<div style="display:flex;align-items:baseline;gap:10px">
      <b style="font-size:15px">最近 7 天学习时长</b>
      <span style="font-size:12px;color:#b6a696">单位：分钟</span></div>`;
    const bars = el('div', { class: 'chart-bars' });
    data.forEach((d) => {
      const col = el('div', { class: 'chart-col' });
      const h = Math.max(4, (d.minutes / max) * 118);
      col.innerHTML = `<div class="bar" style="height:${h}px"><span>${d.minutes > 0 ? d.minutes : ''}</span></div><div class="lbl">${d.day}</div>`;
      bars.appendChild(col);
    });
    card.appendChild(bars);
    return card;
  }

  function stepUsage() {
    const c = Store.state.counts;
    const items = [
      { k: '玩', v: c.play, i: '🎮' },
      { k: '认', v: c.recognize, i: '👀' },
      { k: '练', v: c.practice, i: '✏️' },
      { k: '写', v: c.write, i: '🖊️' },
      { k: '说', v: c.speak, i: '🎤' }
    ];
    const card = el('div', { class: 'chart-card' });
    card.innerHTML = `<b style="font-size:15px">五步环节使用次数</b>
      <p style="margin:6px 0 0;font-size:12.5px;color:#b6a696">如果某一环节次数明显偏少，可以在下方设置里打开它</p>`;
    const row = el('div', { style: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } });
    items.forEach((it) => {
      const chip = el('div', { style: {
        flex: '1 1 90px', background: '#fdf8f1', borderRadius: '16px', padding: '12px 14px', textAlign: 'center'
      } });
      chip.innerHTML = `<div style="font-size:18px">${it.i}</div>
        <div style="font-size:19px;font-weight:800;margin-top:2px">${it.v}</div>
        <div style="font-size:11.5px;color:#b6a696">${it.k}</div>`;
      row.appendChild(chip);
    });
    card.appendChild(row);
    return card;
  }

  function settingRow(title, desc, control) {
    const row = el('div', { class: 'setting-row' });
    const main = el('div', { class: 'st-main' });
    main.innerHTML = `<b>${title}</b>${desc ? `<p>${desc}</p>` : ''}`;
    row.append(main, control);
    return row;
  }

  function seg(options, current, onPick) {
    const box = el('div', { class: 'seg' });
    options.forEach((o) => {
      const b = el('button', { class: o.value === current ? 'on' : '' }, [document.createTextNode(o.label)]);
      b.addEventListener('click', () => {
        Array.from(box.children).forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        onPick(o.value);
        SFX.click();
      });
      box.appendChild(b);
    });
    return box;
  }

  function toggle(on, onChange) {
    const sw = el('button', { class: 'switch' + (on ? ' on' : '') });
    sw.addEventListener('click', () => {
      const next = !sw.classList.contains('on');
      sw.classList.toggle('on', next);
      onChange(next);
      SFX.click();
    });
    return sw;
  }

  function settingsCard() {
    const s = Store.state.settings;
    const card = el('div', { class: 'chart-card' });
    card.innerHTML = `<b style="font-size:15px">学习设置</b>`;

    card.appendChild(settingRow('每日学习时长', '达到时长后会温柔地提醒孩子休息', seg(
      [{ label: '15 分钟', value: 15 }, { label: '30 分钟', value: 30 }, { label: '45 分钟', value: 45 }, { label: '不限', value: 0 }],
      s.dailyLimitMin,
      (v) => { s.dailyLimitMin = v; Store.save(); toast('已保存', '✅', 1200); }
    )));

    card.appendChild(settingRow('每次学习字数', '一次课程连续学几个字', seg(
      [{ label: '2 个', value: 2 }, { label: '3 个', value: 3 }, { label: '5 个', value: 5 }],
      s.charsPerSession,
      (v) => { s.charsPerSession = v; Store.save(); toast('已保存', '✅', 1200); }
    )));

    const stepsRow = el('div', { class: 'setting-row', style: { flexDirection: 'column', alignItems: 'stretch', gap: '10px' } });
    stepsRow.innerHTML = `<div class="st-main"><b>学习环节</b><p>关闭某个环节后，课程会跳过它（例如暂时不练书写）</p></div>`;
    const grid = el('div', { class: 'steps-grid' });
    [['play', '🎮 玩'], ['recognize', '👀 认'], ['practice', '✏️ 练'], ['write', '🖊️ 写'], ['speak', '🎤 说']].forEach(([k, label]) => {
      const b = el('button', { class: 'step-toggle' + (s.steps[k] ? ' on' : '') }, [el('i', {}, [document.createTextNode(label)])]);
      b.addEventListener('click', () => {
        s.steps[k] = !s.steps[k];
        b.classList.toggle('on', s.steps[k]);
        Store.save();
        SFX.click();
      });
      grid.appendChild(b);
    });
    stepsRow.appendChild(grid);
    card.appendChild(stepsRow);

    card.appendChild(settingRow('护眼提醒', '每 15 分钟提醒孩子看看远处', toggle(s.eyeCare, (v) => {
      s.eyeCare = v; Store.save();
    })));

    card.appendChild(settingRow('音效', '点击、答对时的提示音', toggle(s.sfx, (v) => {
      s.sfx = v; Store.save(); SFX.setEnabled(v);
    })));

    card.appendChild(settingRow('解锁全部单元', '不按顺序，自由选择想学的字', toggle(s.unlockAll, (v) => {
      s.unlockAll = v; Store.save(); toast(v ? '已解锁全部单元' : '已恢复顺序解锁', '🔓');
    })));

    card.appendChild(settingRow('朗读语速', '影响汉字和句子的朗读速度', seg(
      [{ label: '慢速', value: 0.65 }, { label: '正常', value: 0.8 }, { label: '稍快', value: 0.95 }],
      s.ttsRate,
      (v) => { s.ttsRate = v; Speech.setRate(v); Store.save(); Speech.speak('你好呀', { rate: v }); }
    )));

    return card;
  }

  function dataCard() {
    const card = el('div', { class: 'chart-card' });
    card.innerHTML = `<b style="font-size:15px">学习档案</b>
      <p style="margin:6px 0 14px;font-size:12.5px;color:#b6a696">档案保存在本机，可导出备份或换电脑时导入</p>`;
    const row = el('div', { class: 'danger-zone' });

    row.appendChild(el('button', { class: 'btn btn-sm btn-ghost', onclick: async () => {
      if (!window.api) return toast('当前环境不支持导出', '⚠️');
      const ok = await window.api.exportData(Store.state);
      toast(ok ? '学习档案已导出' : '已取消导出', ok ? '📤' : 'ℹ️');
    } }, [document.createTextNode('📤 导出档案')]));

    row.appendChild(el('button', { class: 'btn btn-sm btn-ghost', onclick: async () => {
      if (!window.api) return;
      const data = await window.api.importData();
      if (!data) return toast('未导入任何数据', 'ℹ️');
      if (!data.version) return toast('文件格式不正确', '⚠️');
      Store.state = Object.assign(Store.state, data);
      await Store.saveNow();
      toast('档案已导入', '📥');
      window.HZ.App.refreshChrome();
      render(document.getElementById('view'));
    } }, [document.createTextNode('📥 导入档案')]));

    row.appendChild(el('button', { class: 'btn btn-sm btn-ghost', style: { color: '#d9542a' }, onclick: () => {
      const content = el('div', {});
      content.innerHTML = `<div style="text-align:center">
        <div style="font-size:40px">⚠️</div>
        <h3 style="margin:10px 0 6px">确定要清空学习进度吗？</h3>
        <p style="margin:0 0 18px;color:#8b7b6c;font-size:13.5px">已学汉字、星星、勋章都会清零，且无法恢复。建议先导出备份。</p>
      </div>`;
      const row2 = el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } });
      const m = modal(content, { dismissible: true });
      row2.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => m.close() }, [document.createTextNode('再想想')]));
      row2.appendChild(el('button', { class: 'btn btn-primary', onclick: async () => {
        m.close();
        await Store.reset();
        verified = false;
        toast('已重置，开始新的学习旅程', '🌱');
        window.HZ.App.go('map');
        window.HZ.App.refreshChrome();
      } }, [document.createTextNode('确认清空')]));
      content.appendChild(row2);
    } }, [document.createTextNode('🗑️ 重置进度')]));

    card.appendChild(row);
    return card;
  }

  function profileModal(onSaved) {
    const p = Store.state.profile;
    const avatars = ['🐣', '🐥', '🐼', '🦊', '🐰', '🐯', '🐨', '🦄', '🐙', '🐳'];
    const content = el('div', {});
    content.innerHTML = `
      <h3 style="margin:0 0 4px;font-size:19px">孩子的小档案</h3>
      <p style="margin:0 0 16px;color:#8b7b6c;font-size:13px">名字会显示在家长中心的学习报告里</p>
      <input id="pfName" maxlength="8" value="${p.name}" style="width:100%;height:46px;border-radius:14px;border:1.5px solid #f0e2d2;padding:0 14px;font-size:15px;outline:none;background:#fffdf9" />
      <div style="margin:16px 0 6px;font-size:12px;font-weight:800;color:#b19a86;letter-spacing:1.5px">选一个头像</div>
      <div id="pfAvatars" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px">
        <button class="btn btn-ghost" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">保存</button>
      </div>`;
    const m = modal(content, { dismissible: true });
    let picked = p.avatar;
    const wrapA = content.querySelector('#pfAvatars');
    avatars.forEach((a) => {
      const b = el('button', {
        style: {
          width: '46px', height: '46px', borderRadius: '14px', fontSize: '22px',
          background: a === picked ? '#fff1d9' : '#faf5ee',
          boxShadow: a === picked ? 'inset 0 0 0 2px #ffb46b' : 'none'
        },
        onclick: () => {
          picked = a;
          Array.from(wrapA.children).forEach((c) => {
            c.style.background = c.textContent === a ? '#fff1d9' : '#faf5ee';
            c.style.boxShadow = c.textContent === a ? 'inset 0 0 0 2px #ffb46b' : 'none';
          });
          SFX.click();
        }
      }, [document.createTextNode(a)]);
      wrapA.appendChild(b);
    });
    content.querySelector('[data-act="cancel"]').addEventListener('click', () => m.close());
    content.querySelector('[data-act="save"]').addEventListener('click', () => {
      const name = content.querySelector('#pfName').value.trim() || '小朋友';
      Store.state.profile.name = name;
      Store.state.profile.avatar = picked;
      Store.save();
      m.close();
      toast('已保存', '✅', 1400);
      window.HZ.App.refreshChrome();
      if (onSaved) onSaved();
    });
  }

  function render(root) {
    if (!verified) return gate(root);

    const sum = Store.summary();
    root.innerHTML = '';

    const head = el('div', { class: 'parent-head fade-up' });
    head.innerHTML = `
      <div class="ph-ico">${Store.state.profile.avatar}</div>
      <div>
        <h2>${Store.state.profile.name}的学习报告</h2>
        <p>数据只保存在这台电脑上 · 共 ${sum.total} 个汉字 · 今天已学 ${sum.todayMinutes} 分钟</p>
      </div>`;
    const headActions = el('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } });
    headActions.appendChild(el('button', { class: 'btn btn-sm btn-ghost', onclick: () => profileModal(() => render(root)) }, [document.createTextNode('✏️ 编辑档案')]));
    headActions.appendChild(el('button', { class: 'btn btn-sm btn-ghost', onclick: () => window.HZ.App.go('map') }, [document.createTextNode('返回孩子界面')]));
    head.appendChild(headActions);
    root.appendChild(head);

    root.appendChild(reportCards(sum));
    root.appendChild(weekChart());
    root.appendChild(stepUsage());

    const weak = Store.weakChars(12);
    const t = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('需要多复习的字')]), el('span', {}, [document.createTextNode('错误较多或掌握度较低')])]);
    root.appendChild(t);
    const card = el('div', { class: 'chart-card' });
    if (weak.length) {
      const list = el('div', { class: 'weak-list' });
      weak.forEach((c) => {
        const chip = el('button', { class: 'weak-chip', onclick: () => Speech.speak(c.ch, { rate: 0.7 }) });
        chip.innerHTML = `<b>${c.ch}</b><span>${c.pinyin}</span><span style="color:#c9a58c">错 ${c.wrong} 次</span>`;
        list.appendChild(chip);
      });
      card.appendChild(list);
      card.appendChild(el('div', { style: { marginTop: '14px' } }, [
        el('button', { class: 'btn btn-sm btn-sky', onclick: () => {
          window.HZ.Lesson.startReview(weak.slice(0, 8));
        } }, [document.createTextNode('带他复习这几个字')])
      ]));
    } else {
      card.innerHTML = `<p style="margin:0;font-size:13px;color:#8b7b6c">目前没有明显的薄弱字，继续保持～</p>`;
    }
    root.appendChild(card);

    const t2 = el('div', { class: 'section-title' }, [el('h2', {}, [document.createTextNode('设置')]), el('span', {}, [document.createTextNode('按孩子的节奏调整')])]);
    root.appendChild(t2);
    root.appendChild(settingsCard());
    root.appendChild(dataCard());

    const info = el('div', { class: 'card', style: { marginTop: '16px', background: '#fbf8f4', boxShadow: 'none' } });
    info.innerHTML = `<div style="font-size:12.5px;color:#a08f7e;line-height:1.8">
      <b style="color:#7d6d5d">使用建议</b><br>
      · 3-4 岁：以兴趣为主，每天 2 个字，单次 10-15 分钟<br>
      · 5-6 岁：每天 3-5 个字，稳定加入书写和跟读环节<br>
      · 每学 5 个字做一次回看，比一直往前赶更有效<br>
      · 孩子状态不好时少学一点没关系，别让识字变成压力
    </div>`;
    root.appendChild(info);
  }

  window.Views = window.Views || {};
  window.Views.parent = {
    title: '家长中心',
    sub: () => '学习报告 · 时长与环节设置 · 数据管理',
    render
  };
})();
