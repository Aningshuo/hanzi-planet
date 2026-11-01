/* 汉字星球 · 状态与学习算法层 */
(function () {
  const { CHARS, CHAR_MAP, UNIT_META, BOOKS, BADGES } = window.HZ_DATA;

  const DAY = 86400000;
  const REVIEW_STEPS = [1, 2, 4, 7, 15, 30, 60];

  function todayKey(d) {
    const t = d ? new Date(d) : new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  function defaultState() {
    return {
      version: 1,
      profile: { name: '小朋友', avatar: '🐣' },
      chars: {},
      stars: 0,
      stats: {
        booksRead: 0,
        writeCount: 0,
        speakCount: 0,
        streak: 0,
        lastStudyDay: '',
        totalSeconds: 0,
        days: {}
      },
      flags: { perfectQuiz: false },
      badges: {},
      units: {},
      books: {},
      counts: { play: 0, recognize: 0, practice: 0, write: 0, speak: 0 },
      settings: {
        dailyLimitMin: 30,
        charsPerSession: 3,
        steps: { play: true, recognize: true, practice: true, write: true, speak: true },
        eyeCare: true,
        sfx: true,
        ttsRate: 0.8,
        unlockAll: false
      },
      pet: { name: '小星', level: 1, fed: 0, mood: 'happy' },
      createdAt: Date.now()
    };
  }

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
    Object.keys(patch).forEach((k) => {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') {
        deepMerge(base[k], patch[k]);
      } else if (patch[k] !== undefined) {
        base[k] = patch[k];
      }
    });
    return base;
  }

  const Store = {
    state: defaultState(),
    _saveTimer: null,

    async load() {
      try {
        const saved = window.api ? await window.api.loadData() : null;
        if (saved && saved.version) {
          const fresh = defaultState();
          this.state = deepMerge(fresh, saved);
        }
      } catch (e) {
        console.warn('读取档案失败，使用新档案', e);
      }
      return this.state;
    },

    save() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.api) window.api.saveData(this.state);
      }, 240);
    },

    saveNow() {
      clearTimeout(this._saveTimer);
      if (window.api) return window.api.saveData(this.state);
      return Promise.resolve();
    },

    async reset() {
      if (window.api) await window.api.resetData();
      this.state = defaultState();
      this.save();
    },

    /* ------- 时间与统计 ------- */
    today() { return todayKey(); },

    markStudyToday() {
      const s = this.state.stats;
      const today = this.today();
      if (s.lastStudyDay === today) return;
      const yesterday = todayKey(Date.now() - DAY);
      if (s.lastStudyDay === yesterday) s.streak += 1;
      else if (!s.lastStudyDay) s.streak = 1;
      else s.streak = 1;
      s.lastStudyDay = today;
      this.save();
    },

    dayEntry(day) {
      const s = this.state.stats;
      const k = day || this.today();
      if (!s.days[k]) s.days[k] = { seconds: 0, chars: 0, reviews: 0 };
      return s.days[k];
    },

    addSeconds(sec) {
      if (sec <= 0) return;
      this.state.stats.totalSeconds += sec;
      this.dayEntry().seconds += sec;
      this.save();
    },

    todaySeconds() { return this.dayEntry().seconds; },

    todayChars() { return this.dayEntry().chars; },

    /* ------- 学习进度 ------- */
    getChar(ch) {
      return this.state.chars[ch] || null;
    },

    isLearned(ch) { return !!this.state.chars[ch]; },

    learnedCount() { return Object.keys(this.state.chars).length; },

    masteredCount() {
      return Object.values(this.state.chars).filter((c) => c.mastery >= 3).length;
    },

    learnChar(ch) {
      if (this.state.chars[ch]) return this.state.chars[ch];
      const rec = {
        mastery: 1,
        learnedAt: Date.now(),
        lastAt: Date.now(),
        nextReview: Date.now() + DAY,
        reviewCount: 0,
        right: 0,
        wrong: 0
      };
      this.state.chars[ch] = rec;
      this.dayEntry().chars += 1;
      this.markStudyToday();
      this.save();
      return rec;
    },

    reviewChar(ch, ok) {
      const rec = this.state.chars[ch];
      if (!rec) return;
      rec.lastAt = Date.now();
      if (ok) {
        rec.right += 1;
        rec.reviewCount += 1;
        rec.mastery = Math.min(5, rec.mastery + 1);
        const step = REVIEW_STEPS[Math.min(rec.reviewCount, REVIEW_STEPS.length - 1)];
        rec.nextReview = Date.now() + step * DAY;
      } else {
        rec.wrong += 1;
        rec.mastery = Math.max(1, rec.mastery - 1);
        rec.reviewCount = 0;
        rec.nextReview = Date.now() + DAY;
      }
      this.dayEntry().reviews += 1;
      this.markStudyToday();
      this.save();
    },

    dueChars() {
      const now = Date.now();
      return Object.keys(this.state.chars)
        .filter((ch) => this.state.chars[ch].nextReview <= now)
        .map((ch) => CHAR_MAP[ch])
        .filter(Boolean)
        .sort((a, b) => this.state.chars[a.ch].nextReview - this.state.chars[b.ch].nextReview);
    },

    weakChars(n) {
      return Object.entries(this.state.chars)
        .filter(([, v]) => v.wrong > 0 || v.mastery <= 2)
        .sort((a, b) => (b[1].wrong - b[1].mastery) - (a[1].wrong - a[1].mastery))
        .slice(0, n || 8)
        .map(([ch, v]) => ({ ...CHAR_MAP[ch], ...v }))
        .filter((c) => c.ch);
    },

    /* ------- 单元 / 关卡 ------- */
    unitChars(unitId) {
      return CHARS.filter((c) => c.unit === unitId);
    },

    unitProgress(unitId) {
      const list = this.unitChars(unitId);
      const learned = list.filter((c) => this.isLearned(c.ch)).length;
      return { total: list.length, learned, complete: learned === list.length };
    },

    isUnitUnlocked(unitId) {
      if (this.state.settings.unlockAll) return true;
      if (unitId === 1) return true;
      const prev = this.unitProgress(unitId - 1);
      return prev.learned >= Math.ceil(prev.total * 0.75);
    },

    nextUnit() {
      for (const u of UNIT_META) {
        const p = this.unitProgress(u.id);
        if (p.learned < p.total) return { ...u, ...p };
      }
      return null;
    },

    nextChars(n) {
      const out = [];
      for (const u of UNIT_META) {
        if (!this.isUnitUnlocked(u.id)) break;
        for (const c of this.unitChars(u.id)) {
          if (!this.isLearned(c.ch)) out.push(c);
          if (out.length >= (n || 3)) return out;
        }
      }
      return out;
    },

    /* ------- 星星 / 勋章 ------- */
    addStars(n) {
      this.state.stars += n;
      this.state.pet.level = 1 + Math.floor(this.state.stars / 25);
      this.save();
      return this.state.stars;
    },

    checkBadges() {
      const unlocked = [];
      BADGES.forEach((b) => {
        if (this.state.badges[b.id]) return;
        let ok = false;
        try { ok = b.check(this.state); } catch (e) { ok = false; }
        if (ok) {
          this.state.badges[b.id] = Date.now();
          unlocked.push(b);
        }
      });
      if (unlocked.length) this.save();
      return unlocked;
    },

    /* ------- 绘本 ------- */
    isBookUnlocked(book) { return this.learnedCount() >= book.need; },

    markBookRead(bookId) {
      if (this.state.books[bookId]) return false;
      this.state.books[bookId] = Date.now();
      this.state.stats.booksRead = Object.keys(this.state.books).length;
      this.addStars(3);
      this.save();
      return true;
    },

    /* ------- 汇总 ------- */
    summary() {
      const days = Object.keys(this.state.stats.days).filter((d) => this.state.stats.days[d].seconds > 5);
      return {
        learned: this.learnedCount(),
        mastered: this.masteredCount(),
        total: CHARS.length,
        stars: this.state.stars,
        streak: this.state.stats.streak,
        days: days.length,
        totalMinutes: Math.round(this.state.stats.totalSeconds / 60),
        todayMinutes: Math.round(this.todaySeconds() / 60),
        booksRead: this.state.stats.booksRead,
        due: this.dueChars().length,
        badges: Object.keys(this.state.badges).length,
        badgeTotal: BADGES.length
      };
    },

    weekSeries() {
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const k = todayKey(Date.now() - i * DAY);
        const d = this.state.stats.days[k];
        out.push({ day: k.slice(5), minutes: d ? Math.round(d.seconds / 60) : 0, chars: d ? d.chars : 0 });
      }
      return out;
    }
  };

  window.HZ = window.HZ || {};
  window.HZ.Store = Store;
  window.HZ.todayKey = todayKey;
  window.HZ.DAY = DAY;
})();
