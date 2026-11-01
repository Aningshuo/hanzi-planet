/* 汉字星球 · 音效与语音 */
(function () {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, gainVal) {
    const a = ac();
    if (!a) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, a.currentTime + start);
    gain.gain.setValueAtTime(0, a.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainVal == null ? 0.16 : gainVal, a.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(a.currentTime + start);
    osc.stop(a.currentTime + start + dur + 0.05);
  }

  const SFX = {
    setEnabled(v) { enabled = !!v; },

    click() {
      if (!enabled) return;
      tone(660, 0, 0.07, 'triangle', 0.1);
    },
    pop() {
      if (!enabled) return;
      tone(880, 0, 0.09, 'sine', 0.12);
      tone(1180, 0.05, 0.08, 'sine', 0.08);
    },
    correct() {
      if (!enabled) return;
      tone(784, 0, 0.12, 'sine', 0.14);
      tone(1046, 0.1, 0.16, 'sine', 0.12);
      tone(1318, 0.2, 0.2, 'sine', 0.1);
    },
    wrong() {
      if (!enabled) return;
      tone(220, 0, 0.16, 'sawtooth', 0.07);
      tone(180, 0.12, 0.2, 'sawtooth', 0.06);
    },
    star() {
      if (!enabled) return;
      [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.22, 'sine', 0.1));
    },
    unlock() {
      if (!enabled) return;
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.07, 0.3, 'triangle', 0.09));
    },
    page() {
      if (!enabled) return;
      tone(420, 0, 0.1, 'sine', 0.05);
      tone(520, 0.04, 0.12, 'sine', 0.04);
    }
  };

  /* ---------- 语音合成 ---------- */
  let voice = null;
  let rate = 0.8;
  let speaking = false;

  function pickVoice() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices() || [];
    const zh = voices.filter((v) => /zh|cmn|Chinese/i.test(v.lang + ' ' + v.name));
    if (!zh.length) return;
    const prefer = ['Tingting', 'Ting-Ting', 'Meijia', 'Mei-Jia', 'Sinji', 'Huihui', 'Yaoyao', 'Xiaoxiao', 'Google 普通话'];
    voice = zh.find((v) => prefer.some((p) => v.name.includes(p))) || zh[0];
  }

  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  const Speech = {
    setRate(r) { rate = r; },
    available() { return !!window.speechSynthesis; },

    speak(text, opts) {
      if (!text) return Promise.resolve();
      if (!window.speechSynthesis) return Promise.resolve();
      const o = opts || {};
      return new Promise((resolve) => {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'zh-CN';
          if (voice) u.voice = voice;
          u.rate = o.rate || rate;
          u.pitch = o.pitch || 1.1;
          u.volume = 1;
          u.onend = () => { speaking = false; resolve(); };
          u.onerror = () => { speaking = false; resolve(); };
          speaking = true;
          window.speechSynthesis.speak(u);
          setTimeout(() => { if (speaking) { speaking = false; resolve(); } }, Math.max(1600, text.length * 420));
        } catch (e) {
          resolve();
        }
      });
    },

    stop() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speaking = false;
    }
  };

  window.HZ = window.HZ || {};
  window.HZ.SFX = SFX;
  window.HZ.Speech = Speech;
})();
