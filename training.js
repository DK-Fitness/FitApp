/* ═══════════════════════════════════════════════════════════════
   training.js — Moteur partagé v4
   ═══════════════════════════════════════════════════════════════
   Modules :
     STORAGE      — lecture / écriture / suppression localStorage
     PARSING      — sanitize kg, reps, rir (rejette NaN / négatif)
     PROGRESSION  — delta, PR, suggestion, volume
     DATA         — export JSON, import JSON, reset
     TIMER        — chrono repos (sans fuite de setInterval)
     WORKOUT      — mode séance (sans double démarrage)
     CARD LOG     — log par set intégré dans les cards d'exercice
     SESSION LOG  — résumé de fin de séance + métriques live
   ═══════════════════════════════════════════════════════════════ */

const T = {
  PROFILE_KEY: 'user_profile',
  WORKOUT_SESSIONS_KEY: 'workout_sessions',
  CUSTOM_WORKOUTS_KEY: 'custom_workouts_v1',

  /* ════════════════════════════════════════════════════════════
     STORAGE
  ════════════════════════════════════════════════════════════ */

  storageKey(session, exName) {
    return `log_${session}_${exName.toLowerCase().replace(/\s+/g, '_')}`;
  },

  getHistory(session, exName) {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey(session, exName))) || [];
    } catch { return []; }
  },

  getLast(session, exName) {
    const h = this.getHistory(session, exName);
    return h.length ? h[0] : null;
  },

  getProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.PROFILE_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch { return {}; }
  },

  saveProfile(profile) {
    const prev = this.getProfile();
    const next = { ...prev, ...(profile || {}) };
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(next));
    if (window.C && typeof window.C.saveProfile === 'function') {
      window.C.saveProfile(next).catch(() => {});
    }
    return next;
  },

  getBodyweight() {
    const w = this._num(this.getProfile().weightKg);
    return w === '' ? null : w;
  },

  getCustomWorkouts() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.CUSTOM_WORKOUTS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  },

  saveCustomWorkouts(items) {
    localStorage.setItem(this.CUSTOM_WORKOUTS_KEY, JSON.stringify(items || []));
  },

  addCustomWorkout(workout) {
    const list = this.getCustomWorkouts();
    list.unshift(workout);
    this.saveCustomWorkouts(list);
  },

  deleteCustomWorkout(slug) {
    const list = this.getCustomWorkouts().filter(w => w.slug !== slug);
    this.saveCustomWorkouts(list);
  },

  getAllWorkoutsMap(staticMap) {
    const map = { ...(staticMap || {}) };
    this.getCustomWorkouts().forEach(w => {
      if (w && w.slug) map[w.slug] = w;
    });
    return map;
  },

  getAllSessions(staticSessions, staticWorkouts) {
    const bySlug = {};
    (staticSessions || []).forEach(s => bySlug[s.slug] = { ...s });
    const allWorkouts = this.getAllWorkoutsMap(staticWorkouts || {});
    Object.values(allWorkouts).forEach(w => {
      if (!w || !w.slug) return;
      const exNames = (w.exercises || []).map(e => e.name).filter(Boolean);
      if (!bySlug[w.slug]) {
        bySlug[w.slug] = {
          slug: w.slug,
          name: w.displayName || w.name || w.title || w.slug,
          icon: w.icon || '🧩',
          tag: w.tag || 'Personnalisée',
          exercises: exNames
        };
      } else if (!bySlug[w.slug].exercises?.length) {
        bySlug[w.slug].exercises = exNames;
        bySlug[w.slug].name = bySlug[w.slug].name || w.displayName || w.name || w.title || w.slug;
      }
    });
    return Object.values(bySlug);
  },

  /**
   * Sauvegarde une entrée par set (tableau de sets).
   * data = { date, sets: [{kg, reps, rir}, ...] }
   */
  saveLog(session, exName, data) {
    const history = this.getHistory(session, exName);
    history.unshift({
      date: data.date || new Date().toISOString(),
      sets: data.sets || [],
    });
    if (history.length > 50) history.pop();
    localStorage.setItem(this.storageKey(session, exName), JSON.stringify(history));
    if (window.C && typeof window.C.saveLog === 'function') {
      window.C.saveLog(session, exName, history).catch(() => {});
    }
  },

  /** Supprime l'entrée la plus récente d'un exercice */
  deleteLastLog(session, exName) {
    const history = this.getHistory(session, exName);
    if (!history.length) return false;
    history.shift();
    localStorage.setItem(this.storageKey(session, exName), JSON.stringify(history));
    return true;
  },

  /** Supprime une entrée précise par index (0 = la plus récente) */
  deleteHistoryEntry(session, exName, idx) {
    const history = this.getHistory(session, exName);
    if (idx < 0 || idx >= history.length) return false;
    history.splice(idx, 1);
    localStorage.setItem(this.storageKey(session, exName), JSON.stringify(history));
    return true;
  },

  /** Efface toutes les entrées d'une séance */
  resetSession(session, exercises) {
    exercises.forEach(ex => localStorage.removeItem(this.storageKey(session, ex)));
  },

  /** Retourne toutes les clés training du localStorage */
  _allLogKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('log_')) keys.push(k);
    }
    return keys;
  },

  /* ════════════════════════════════════════════════════════════
     PARSING — sanitize les valeurs saisies
  ════════════════════════════════════════════════════════════ */

  /** Float ≥ 0, ou '' si invalide */
  _num(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = parseFloat(String(v).replace(',', '.'));
    return (isNaN(n) || n < 0) ? '' : n;
  },

  /** Int ≥ 0, ou '' si invalide */
  _int(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = parseInt(v, 10);
    return (isNaN(n) || n < 0) ? '' : n;
  },

  parseKgInput(v) {
    if (v === null || v === undefined) return { raw: '', kg: '' };
    const raw = String(v).trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return { raw: '', kg: '' };
    const bw = this.getBodyweight();
    if (raw === 'PDC') return { raw: 'PDC', kg: bw !== null ? bw : '' };
    const m = raw.match(/^PDC([+-]\d+(?:[.,]\d+)?)$/);
    if (m) {
      if (bw === null) return { raw, kg: '' };
      const add = parseFloat(m[1].replace(',', '.'));
      const val = bw + add;
      return { raw, kg: val < 0 ? '' : val };
    }
    const n = this._num(raw.replace(',', '.'));
    return { raw, kg: n };
  },

  getSetKg(set) {
    if (!set) return 0;
    if (set.kgResolved !== undefined && set.kgResolved !== null && set.kgResolved !== '') {
      return this._num(set.kgResolved) || 0;
    }
    const parsed = this.parseKgInput(set.kgRaw ?? set.kg);
    if (parsed.kg !== '') return parsed.kg;
    return this._num(set.kg) || 0;
  },

  getSetVolume(set) {
    return (this.getSetKg(set) || 0) * (this._int(set?.reps) || 0);
  },

  /* ════════════════════════════════════════════════════════════
     PROGRESSION
  ════════════════════════════════════════════════════════════ */

  getProgressStatus(session, exName, kg, reps) {
    const last = this.getLast(session, exName);
    if (!last) return null;
    const lastSets = last.sets || [];
    const kgOld  = lastSets.length ? Math.max(...lastSets.map(s => this.getSetKg(s) || 0)) : 0;
    const repOld = lastSets.length ? Math.max(...lastSets.map(s => this._int(s.reps) || 0)) : 0;
    const kgNew  = this.parseKgInput(kg).kg;
    const repNew = this._int(reps);
    if (kgNew === '') return null;
    const dKg   = kgNew - kgOld;
    const dReps = repNew !== '' ? repNew - repOld : 0;
    if (dKg > 0)   return { type: 'up',    msg: `+${dKg} kg` };
    if (dKg < 0)   return { type: 'down',  msg: `${dKg} kg` };
    if (dReps > 0) return { type: 'up',    msg: `+${dReps} rep` };
    if (dReps < 0) return { type: 'down',  msg: `${dReps} rep` };
    return { type: 'equal', msg: '=' };
  },

  isPR(session, exName, kg) {
    const kgNum = this.parseKgInput(kg).kg;
    if (kgNum === '' || kgNum <= 0) return false;
    const history = this.getHistory(session, exName);
    if (!history.length) return false;
    const allKgs = history.flatMap(h => (h.sets || []).map(s => this.getSetKg(s) || 0));
    return kgNum > Math.max(...allKgs);
  },

  getBestKg(session, exName) {
    const vals = this.getHistory(session, exName)
      .flatMap(h => (h.sets || []).map(s => this.getSetKg(s)))
      .filter(v => v !== '' && v > 0);
    return vals.length ? Math.max(...vals) : null;
  },

  getBestVolume(session, exName) {
    // Volume = kg × reps, meilleure séance
    let best = 0;
    this.getHistory(session, exName).forEach(h => {
      const vol = (h.sets || []).reduce((s, set) =>
        s + this.getSetVolume(set), 0);
      if (vol > best) best = vol;
    });
    return best || null;
  },

  getAvgKg(session, exName) {
    const all = this.getHistory(session, exName);
    if (!all.length) return null;
    const vals = all.flatMap(h => (h.sets || []).map(s => this.getSetKg(s))).filter(v => v !== '' && v > 0);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  },

  getAvgReps(session, exName) {
    const all = this.getHistory(session, exName);
    if (!all.length) return null;
    const vals = all.flatMap(h => (h.sets || []).map(s => this._int(s.reps))).filter(v => v !== '' && v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  },

  getLastProgression(session, exName) {
    // Retourne la variation du meilleur kg entre les 2 dernières séances
    const h = this.getHistory(session, exName);
    if (h.length < 2) return null;
    const best = entry => Math.max(0, ...((entry.sets || []).map(s => this.getSetKg(s) || 0)));
    return best(h[0]) - best(h[1]);
  },

  getBestSet(session, exName) {
    let best = null, bestVol = 0;
    this.getHistory(session, exName).forEach(h => {
      (h.sets || []).forEach(s => {
        const v = this.getSetVolume(s);
        if (v > bestVol) { bestVol = v; best = s; }
      });
    });
    return best;
  },

  getNextSuggestion(session, exName) {
    const last = this.getLast(session, exName);
    if (!last) return null;
    const sets = last.sets || [];
    if (!sets.length) return null;
    const heaviest = sets.reduce((a, b) => (this.getSetKg(b) || 0) > (this.getSetKg(a) || 0) ? b : a, sets[0]);
    const kg  = this.getSetKg(heaviest);
    const rir = this._int(heaviest.rir);
    if (kg === '') return null;
    if (rir === '' || rir <= 1) return `+2.5 kg → ${(kg + 2.5).toFixed(1)} kg`;
    if (rir <= 2)               return `Maintiens ${kg} kg, vise +1 rep`;
    return                             `Maintiens ${kg} kg, améliore le contrôle`;
  },

  /**
   * Volume total d'une séance pour une liste d'exercices
   * @param {number} entryIndex  0 = séance la plus récente, 1 = précédente…
   */
  getSessionVolume(session, exercises, entryIndex = 0) {
    return exercises.reduce((sum, ex) => {
      const h = this.getHistory(session, ex);
      if (!h[entryIndex]) return sum;
      const sets = h[entryIndex].sets || [];
      return sum + sets.reduce((s, set) => {
        return s + this.getSetVolume(set);
      }, 0);
    }, 0);
  },

  /** Calcule le volume de la session en cours depuis les cards actives */
  getLiveSessionVolume(session, exerciseNames) {
    return exerciseNames.reduce((sum, ex) => {
      const h = this.getHistory(session, ex);
      if (!h.length) return sum;
      // Prend l'entrée du jour si disponible
      const today = new Date().toDateString();
      const todayEntry = h.find(e => new Date(e.date).toDateString() === today);
      if (!todayEntry) return sum;
      return sum + (todayEntry.sets || []).reduce((s, set) =>
        s + this.getSetVolume(set), 0);
    }, 0);
  },

  /** Compte les sets sauvegardés aujourd'hui pour un exercice */
  getSavedSetsToday(session, exName) {
    const h = this.getHistory(session, exName);
    if (!h.length) return 0;
    const today = new Date().toDateString();
    const todayEntry = h.find(e => new Date(e.date).toDateString() === today);
    return todayEntry ? (todayEntry.sets || []).length : 0;
  },

  /* ════════════════════════════════════════════════════════════
     DATA — export / import / reset global
  ════════════════════════════════════════════════════════════ */

  exportJSON() {
    const data = {};
    this._allLogKeys().forEach(key => {
      try { data[key] = JSON.parse(localStorage.getItem(key)); } catch {}
    });
    data[this.PROFILE_KEY] = this.getProfile();
    data[this.WORKOUT_SESSIONS_KEY] = this.getWorkoutSessions();
    data[this.CUSTOM_WORKOUTS_KEY] = this.getCustomWorkouts();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `training_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data  = JSON.parse(e.target.result);
          let   count = 0;
          Object.entries(data).forEach(([key, value]) => {
            if (key === this.PROFILE_KEY && value && typeof value === 'object') {
              localStorage.setItem(key, JSON.stringify(value));
              count++;
            } else if (key === this.WORKOUT_SESSIONS_KEY && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
              count++;
            } else if (key === this.CUSTOM_WORKOUTS_KEY && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
              count++;
            } else if (key.startsWith('log_') && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
              count++;
            }
          });
          resolve(count);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Lecture impossible'));
      reader.readAsText(file);
    });
  },

  resetAllData() {
    const keys = this._allLogKeys();
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(this.PROFILE_KEY);
    localStorage.removeItem(this.WORKOUT_SESSIONS_KEY);
    localStorage.removeItem(this.CUSTOM_WORKOUTS_KEY);
    return keys.length;
  },

  getWorkoutSessions() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.WORKOUT_SESSIONS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  },

  saveWorkoutSessions(sessions) {
    localStorage.setItem(this.WORKOUT_SESSIONS_KEY, JSON.stringify(sessions || []));
    if (window.C && typeof window.C.saveWorkoutSessions === 'function') {
      window.C.saveWorkoutSessions(sessions || []).catch(() => {});
    }
  },

  recordWorkoutSession(payload) {
    const arr = this.getWorkoutSessions();
    arr.unshift({
      date: payload?.date || new Date().toISOString(),
      session: payload?.session || '',
      durationSec: this._int(payload?.durationSec) || 0,
      volume: this._num(payload?.volume) || 0,
      totalSets: this._int(payload?.totalSets) || 0,
    });
    if (arr.length > 400) arr.pop();
    this.saveWorkoutSessions(arr);
  },

  /* ════════════════════════════════════════════════════════════
     TIMER — chrono repos
  ════════════════════════════════════════════════════════════ */

  _timer:          null,
  _timerRemaining: 0,

  startTimer(seconds, label) {
    this.stopTimer();
    this._timerRemaining = seconds;

    let overlay = document.getElementById('timer-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'timer-overlay';
      overlay.style.cssText = [
        'position:fixed;bottom:24px;right:24px;z-index:9999',
        'background:#141414;border:1px solid #e8390e;border-radius:8px',
        'padding:16px 22px;min-width:180px',
        'box-shadow:0 8px 40px rgba(232,57,14,.3)',
        "font-family:'DM Sans',sans-serif",
      ].join(';');
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#e8390e;font-weight:700;margin-bottom:6px;">⏱ REPOS — ${label}</div>
      <div id="timer-countdown" style="font-family:'Bebas Neue',sans-serif;font-size:52px;color:#f0f0f0;line-height:1;text-align:center;"></div>
      <div id="timer-progress-bar" style="height:3px;background:#2a2a2a;border-radius:2px;margin-top:8px;overflow:hidden;">
        <div id="timer-progress-fill" style="height:100%;background:#e8390e;border-radius:2px;transition:width 1s linear;width:100%;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button onclick="T.stopTimer()" style="flex:1;background:rgba(232,57,14,.15);border:1px solid rgba(232,57,14,.4);color:#e8390e;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;font-weight:700;">✕ Stop</button>
        <button onclick="T.addTime(30)"  style="flex:1;background:rgba(255,255,255,.05);border:1px solid #2a2a2a;color:#888;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;">+30s</button>
      </div>`;

    const totalSec = seconds;
    const tick = () => {
      const el   = document.getElementById('timer-countdown');
      const fill = document.getElementById('timer-progress-fill');
      if (!el) { this.stopTimer(); return; }
      const r = this._timerRemaining;
      el.textContent = `${Math.floor(r / 60)}:${(r % 60).toString().padStart(2, '0')}`;
      el.style.color = r <= 10 ? '#e8390e' : '#f0f0f0';
      if (fill) fill.style.width = `${Math.min(100, (r / totalSec) * 100)}%`;
      if (r <= 0) {
        this.stopTimer();
        this._beep();
        const o = document.getElementById('timer-overlay');
        if (o) {
          o.innerHTML = `<div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:#e8390e;text-align:center;letter-spacing:2px;">GO ! 🔥</div>`;
          setTimeout(() => o.remove(), 2000);
        }
        return;
      }
      this._timerRemaining--;
    };

    tick();
    this._timer = setInterval(tick, 1000);
  },

  addTime(s) {
    this._timerRemaining = Math.max(0, (this._timerRemaining || 0) + s);
  },

  stopTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    const o = document.getElementById('timer-overlay');
    if (o) o.remove();
    this._timerRemaining = 0;
  },

  _beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.15, 0.3].forEach(t => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.13);
      });
    } catch { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
  },

  /* ════════════════════════════════════════════════════════════
     WORKOUT MODE
  ════════════════════════════════════════════════════════════ */

  _workoutActive:    false,
  _currentExIdx:     0,
  _exCards:          [],
  _workoutStartTime: null,
  _elapsedInterval:  null,
  _sessionExercises: [],
  _sessionSlug:      '',
  _cardLogs:         [],

  startWorkout(session, exercises) {
    if (this._workoutActive) return;
    this._workoutActive    = true;
    this._currentExIdx     = 0;
    this._exCards          = Array.from(document.querySelectorAll('.ex-card'));
    this._workoutStartTime = Date.now();
    this._sessionExercises = exercises || [];
    this._sessionSlug      = session || '';
    this._cardLogs         = [];

    document.getElementById('workout-bar')?.remove();

    const bar = document.createElement('div');
    bar.id = 'workout-bar';
    bar.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:9998',
      'background:#141414;border-bottom:2px solid #e8390e',
      "padding:10px 20px;display:flex;align-items:center;justify-content:space-between",
      "font-family:'DM Sans',sans-serif",
    ].join(';');
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#e8390e;letter-spacing:2px;">⚡ SÉANCE EN COURS</span>
        <span id="workout-elapsed" style="font-size:13px;color:#888;"></span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <span id="workout-expos" style="font-size:12px;color:#888;"></span>
        <button onclick="T.prevExercise()" style="background:rgba(255,255,255,.06);border:1px solid #333;color:#888;padding:7px 14px;border-radius:4px;font-size:12px;cursor:pointer;">← Préc</button>
        <button onclick="T.nextExercise()" style="background:#e8390e;border:none;color:white;padding:7px 16px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:1px;">SUIVANT →</button>
        <button onclick="T.finishSession()"  style="background:rgba(255,255,255,.06);border:1px solid #333;color:#888;padding:7px 14px;border-radius:4px;font-size:12px;cursor:pointer;">🏁 Fin</button>
      </div>`;
    document.body.prepend(bar);
    document.body.style.paddingTop = '56px';

    if (this._elapsedInterval) clearInterval(this._elapsedInterval);
    this._elapsedInterval = setInterval(() => {
      const el = document.getElementById('workout-elapsed');
      if (!el) { clearInterval(this._elapsedInterval); return; }
      const s = Math.floor((Date.now() - this._workoutStartTime) / 1000);
      el.textContent = `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')} écoulé`;
      // Mise à jour du bandeau de progression live
      this._updateLiveBanner();
    }, 1000);

    this._highlightExercise(0);
  },

  _updateLiveBanner() {
    const banner = document.getElementById('session-live-banner');
    if (!banner || !this._sessionSlug || !this._sessionExercises.length) return;
    const vol = this.getLiveSessionVolume(this._sessionSlug, this._sessionExercises);
    const sets = this._sessionExercises.reduce((acc, ex) =>
      acc + this.getSavedSetsToday(this._sessionSlug, ex), 0);
    const volEl = banner.querySelector('#live-vol');
    const setsEl = banner.querySelector('#live-sets');
    if (volEl) volEl.textContent = vol ? `${vol.toLocaleString('fr-FR')} kg` : '—';
    if (setsEl) setsEl.textContent = sets || '—';
  },

  _highlightExercise(idx) {
    this._exCards.forEach((c, i) => {
      c.style.opacity         = i === idx ? '1' : '0.3';
      c.style.borderLeftColor = i === idx ? '#ff6b35' : '';
      c.style.transform       = i === idx ? 'scale(1.01)' : 'scale(1)';
      c.style.transition      = 'all .3s';
    });
    this._exCards[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const el = document.getElementById('workout-expos');
    if (el) el.textContent = `${idx + 1} / ${this._exCards.length}`;

    // Auto-focus sur le premier input vide de l'exercice courant
    setTimeout(() => {
      const card   = this._exCards[idx];
      if (!card) return;
      const inputs = card.querySelectorAll('.clz-input:not([readonly])');
      const empty  = Array.from(inputs).find(inp => !inp.value);
      if (empty) empty.focus();
    }, 400);
  },

  prevExercise() {
    if (this._currentExIdx > 0) {
      this._currentExIdx--;
      this._highlightExercise(this._currentExIdx);
    }
  },

  nextExercise() {
    if (this._currentExIdx < this._exCards.length - 1) {
      this._currentExIdx++;
      this._highlightExercise(this._currentExIdx);
    } else {
      this.finishSession();
    }
  },

  _draftKey(session, exName) {
    return `draft_${session}_${exName.toLowerCase().replace(/\s+/g, '_')}`;
  },

  _loadDraft(session, exName) {
    try {
      return JSON.parse(localStorage.getItem(this._draftKey(session, exName)) || 'null');
    } catch { return null; }
  },

  _saveDraft(session, exName, payload) {
    try {
      localStorage.setItem(this._draftKey(session, exName), JSON.stringify(payload));
    } catch {}
  },

  _clearDraft(session, exName) {
    localStorage.removeItem(this._draftKey(session, exName));
  },

  _registerCardLog(entry) {
    if (!this._sessionSlug && entry?.session) this._sessionSlug = entry.session;
    const i = this._cardLogs.findIndex(e => e.session === entry.session && e.exName === entry.exName);
    if (i >= 0) this._cardLogs[i] = entry;
    else this._cardLogs.push(entry);
  },

  isExerciseFullyValidated(session, exName) {
    const rec = this._cardLogs.find(e => e.session === session && e.exName === exName);
    return !!(rec && rec.isFullyValidated());
  },

  finishSession() {
    const targetSession = this._sessionSlug || this._cardLogs[0]?.session || '';
    const logs = this._cardLogs.filter(x => x.session === targetSession);
    if (!logs.length) {
      alert("Tu dois valider tous les sets avant de terminer la séance");
      return;
    }
    const hasInvalid = logs.some(l => !l.isFullyValidated());
    if (hasInvalid) {
      alert("Tu dois valider tous les sets avant de terminer la séance");
      return;
    }

    logs.forEach(l => {
      const sets = l.getSetsToSave();
      if (sets.length) {
        this.saveLog(l.session, l.exName, { date: new Date().toISOString(), sets });
        this._clearDraft(l.session, l.exName);
        document.dispatchEvent(new CustomEvent('exercise-saved', { detail: { session: l.session, exName: l.exName } }));
      }
    });
    if (!this._workoutStartTime) this._workoutStartTime = Date.now();
    this._showSessionSummary();
  },

  _showSessionSummary() {
    const elapsed = Date.now() - this._workoutStartTime;
    const s       = Math.floor(elapsed / 1000);
    this.stopWorkout();

    const slug = this._sessionSlug;
    const exes = this._sessionExercises;

    // Calcule les stats de fin de séance
    const volToday = this.getLiveSessionVolume(slug, exes);
    const volPrev  = this.getSessionVolume(slug, exes, 1);
    const dVol     = volPrev > 0 ? Math.round(((volToday - volPrev) / volPrev) * 100) : null;

    const prs = exes.filter(ex => {
      const h = this.getHistory(slug, ex);
      if (h.length < 2) return false;
      const best = entry => Math.max(0, ...((entry.sets || []).map(set => this.getSetKg(set) || 0)));
      return best(h[0]) > best(h[1]);
    });

    const totalSets = exes.reduce((acc, ex) => acc + this.getSavedSetsToday(slug, ex), 0);
    const completedExes = exes.filter(ex => this.getSavedSetsToday(slug, ex) > 0);

    const prItems = prs.map(ex => {
      const h = this.getHistory(slug, ex);
      const kg = Math.max(...((h[0].sets || []).map(set => this.getSetKg(set) || 0)));
      return `<div style="font-size:13px;color:#f4b942;padding:4px 0;">🏆 ${ex} — ${kg} kg</div>`;
    }).join('');

    const volDeltaHtml = dVol !== null
      ? `<span style="font-size:14px;font-weight:700;padding:4px 12px;border-radius:4px;background:${dVol >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'};color:${dVol >= 0 ? '#22c55e' : '#ef4444'};">${dVol >= 0 ? '+' : ''}${dVol}% vs précédente</span>`
      : '';

    this.recordWorkoutSession({
      date: new Date().toISOString(),
      session: slug,
      durationSec: s,
      volume: volToday,
      totalSets
    });

    const done = document.createElement('div');
    done.style.cssText = "position:fixed;inset:0;background:rgba(13,13,13,.97);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;overflow-y:auto;padding:40px 20px;";
    done.innerHTML = `
      <div style="max-width:480px;width:100%;text-align:center;">
        <div style="font-size:64px;margin-bottom:8px;">🏆</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;color:#e8390e;letter-spacing:4px;line-height:1;">SÉANCE</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;color:#f0f0f0;letter-spacing:4px;line-height:1;margin-bottom:28px;">TERMINÉE</div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px 12px;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#f0f0f0;">${Math.floor(s / 60)}<span style="font-size:18px;">m</span>${s % 60}<span style="font-size:18px;">s</span></div>
            <div style="font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Durée</div>
          </div>
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px 12px;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#f0f0f0;">${completedExes.length}<span style="font-size:16px;color:#555;">/${exes.length}</span></div>
            <div style="font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Exercices</div>
          </div>
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px 12px;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#f0f0f0;">${totalSets}</div>
            <div style="font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Sets faits</div>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:16px;text-align:left;">
          <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#e8390e;margin-bottom:10px;">Volume total</div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#f0f0f0;">${volToday ? volToday.toLocaleString('fr-FR') + ' kg' : '—'}</div>
            ${volDeltaHtml}
          </div>
        </div>

        ${prs.length > 0 ? `
        <div style="background:rgba(244,185,66,.05);border:1px solid rgba(244,185,66,.25);border-radius:6px;padding:16px 20px;margin-bottom:16px;text-align:left;">
          <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f4b942;margin-bottom:10px;">🏆 Records battus</div>
          ${prItems}
        </div>` : ''}

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button onclick="this.closest('div[style*=inset]').remove()" style="background:#e8390e;border:none;color:white;padding:12px 28px;border-radius:6px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;cursor:pointer;">FERMER</button>
          <button onclick="window.location.href='index.html'" style="background:#1a1a1a;border:1px solid #2a2a2a;color:#888;padding:12px 20px;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">← Hub</button>
        </div>
      </div>`;
    document.body.appendChild(done);
  },

  stopWorkout() {
    this._workoutActive = false;
    if (this._elapsedInterval) { clearInterval(this._elapsedInterval); this._elapsedInterval = null; }
    document.getElementById('workout-bar')?.remove();
    document.body.style.paddingTop = '';
    this._exCards.forEach(c => {
      c.style.opacity = '1'; c.style.borderLeftColor = ''; c.style.transform = '';
    });
    this._exCards = [];
    this._cardLogs = [];
  },

  /* ════════════════════════════════════════════════════════════
     SESSION LIVE BANNER — affiché sur la page séance
  ════════════════════════════════════════════════════════════ */

  initLiveBanner(session, exerciseNames) {
    const el = document.getElementById('session-live-banner');
    if (!el) return;

    const updateBanner = () => {
      const vol  = this.getLiveSessionVolume(session, exerciseNames);
      const sets = exerciseNames.reduce((acc, ex) => acc + this.getSavedSetsToday(session, ex), 0);
      const volPrev = this.getSessionVolume(session, exerciseNames, 1);
      const dVol = volPrev > 0 && vol > 0 ? Math.round(((vol - volPrev) / volPrev) * 100) : null;

      const prs = exerciseNames.filter(ex => {
        const h = this.getHistory(session, ex);
        if (h.length < 2) return false;
        const today = new Date().toDateString();
        const todayEntry = h.find(e => new Date(e.date).toDateString() === today);
        if (!todayEntry) return false;
        const bestToday = Math.max(...((todayEntry.sets || []).map(s => this.getSetKg(s) || 0)));
        const bestPrev  = Math.max(...(h.filter(e => new Date(e.date).toDateString() !== today)
          .flatMap(e => (e.sets || []).map(s => this.getSetKg(s) || 0))));
        return bestToday > bestPrev;
      }).length;

      el.querySelector('#live-vol').textContent  = vol  ? `${vol.toLocaleString('fr-FR')} kg`  : '—';
      el.querySelector('#live-sets').textContent = sets || '—';
      el.querySelector('#live-prs').textContent  = prs  || '—';

      const deltaEl = el.querySelector('#live-delta');
      if (dVol !== null) {
        deltaEl.textContent = `${dVol >= 0 ? '+' : ''}${dVol}%`;
        deltaEl.style.color = dVol >= 0 ? '#22c55e' : '#ef4444';
      } else {
        deltaEl.textContent = '—';
        deltaEl.style.color = '#555';
      }

      // Indicateur global
      const indicEl = el.querySelector('#live-indicator');
      if (indicEl) {
        if (prs > 0) {
          indicEl.textContent = '🏆 PR en cours';
          indicEl.style.color = '#f4b942';
        } else if (dVol !== null && dVol > 0) {
          indicEl.textContent = `↑ +${dVol}% vs précédente`;
          indicEl.style.color = '#22c55e';
        } else if (dVol !== null && dVol < 0) {
          indicEl.textContent = `↓ ${dVol}% vs précédente`;
          indicEl.style.color = '#ef4444';
        } else if (sets > 0) {
          indicEl.textContent = '✓ En progression';
          indicEl.style.color = '#888';
        } else {
          indicEl.textContent = 'Commence le log';
          indicEl.style.color = '#555';
        }
      }
    };

    updateBanner();
    document.addEventListener('exercise-saved', updateBanner);
  },

  /* ════════════════════════════════════════════════════════════
     CARD LOG — log par set intégré dans les cards
  ════════════════════════════════════════════════════════════ */

  /**
   * Génère et injecte la zone de log dans une card d'exercice.
   * @param {HTMLElement} card       - la .ex-card
   * @param {string}      session    - slug de séance
   * @param {string}      exName     - nom de l'exercice
   * @param {Array}       planSets   - sets planifiés depuis workouts.js
   */
  initCardLog(card, session, exName, planSets) {
    const last       = this.getLast(session, exName);
    const lastSets   = last ? (last.sets || []) : [];
    const suggestion = this.getNextSuggestion(session, exName);
    const bestKg     = this.getBestKg(session, exName);
    const lastDate   = last ? new Date(last.date).toLocaleDateString('fr-FR') : null;
    const history    = this.getHistory(session, exName);
    const entryCount = history.length;

    // Zone log (wrapper injecté dans .ex-body)
    const zone = document.createElement('div');
    zone.className = 'card-log-zone';

    // ── Infos contextuelles ──
    let ctxHtml = '';

    if (lastDate && lastSets.length) {
      const summary = lastSets.map(s =>
        `${s.kgRaw || (s.kg != null ? s.kg + ' kg' : '—')} × ${s.reps != null ? s.reps + ' r' : '—'}`
      ).join(' · ');
      ctxHtml += `<div class="clz-last">📅 ${lastDate} <span class="clz-last-detail">— ${summary}</span></div>`;
    } else {
      ctxHtml += `<div class="clz-last clz-new">✦ Premier log</div>`;
    }

    if (bestKg) {
      ctxHtml += `<span class="clz-pr">🏆 PR ${bestKg} kg</span>`;
    }

    if (suggestion) {
      ctxHtml += `<span class="clz-suggest">💡 ${suggestion}</span>`;
    }

    // ── Rows de sets ──
    let setsHtml = '';
    planSets.forEach((s, i) => {
      const kgPh   = s.charge || 'kg';
      const repsPh = s.reps ? s.reps.split(' ')[0] : 'reps';
      const rirPh  = s.rir  ? s.rir.replace('RIR ', '') : '—';
      setsHtml += `
        <div class="clz-set-row${s.drop ? ' clz-drop-set' : ''}" data-set-idx="${i}">
          <span class="clz-set-label${s.drop ? ' clz-label-drop' : ''}">${s.label}</span>
          <div class="clz-fields">
            <input class="clz-input clz-kg"   type="text" placeholder="${kgPh}"  inputmode="text">
            <span class="clz-sep">×</span>
            <input class="clz-input clz-reps" type="number"            min="0" placeholder="${repsPh}" inputmode="numeric">
            <span class="clz-sep clz-sep-rir">RIR</span>
            <input class="clz-input clz-rir"  type="number" max="5"    min="0" placeholder="${rirPh}"  inputmode="numeric">
          </div>
          <button class="clz-validate-btn" title="Valider ce set">✓</button>
          <span class="clz-set-status"></span>
        </div>`;
    });

    zone.innerHTML = `
      <div class="clz-context">${ctxHtml}</div>
      <div class="clz-sets">${setsHtml}</div>
      <div class="clz-footer">
        <span class="clz-feedback">Auto-save actif · valide chaque set avec ✓</span>
      </div>`;

    card.querySelector('.ex-body').appendChild(zone);

    // ── État interne ──
    const state = {
      sets:  planSets.map(() => ({ kg: '', reps: '', rir: '', validated: false })),
      saved: false,
    };

    const setRows    = zone.querySelectorAll('.clz-set-row');
    const feedback   = zone.querySelector('.clz-feedback');
    const saveDraft = () => {
      this._saveDraft(session, exName, { updatedAt: new Date().toISOString(), sets: state.sets });
    };

    const applyValidatedUI = (row, validateBtn, statusEl, kgInput, repsInput, rirInput) => {
      [kgInput, repsInput, rirInput].forEach(inp => {
        inp.readOnly = true;
        inp.classList.add('clz-validated');
      });
      validateBtn.textContent = '✎';
      validateBtn.title       = 'Modifier';
      validateBtn.classList.add('clz-edit-mode');
      statusEl.className   = 'clz-set-status clz-status-ok';
      statusEl.textContent = '✓';
    };

    const draft = this._loadDraft(session, exName);

    // ── Pré-rempli depuis dernier log ──
    setRows.forEach((row, i) => {
      const kgInput    = row.querySelector('.clz-kg');
      const repsInput  = row.querySelector('.clz-reps');
      const rirInput   = row.querySelector('.clz-rir');
      const validateBtn= row.querySelector('.clz-validate-btn');
      const statusEl   = row.querySelector('.clz-set-status');

      if (lastSets[i]) {
        if (lastSets[i].kgRaw != null) kgInput.value = lastSets[i].kgRaw;
        else if (lastSets[i].kg   != null) kgInput.value = lastSets[i].kg;
        if (lastSets[i].reps != null) repsInput.value = lastSets[i].reps;
        if (lastSets[i].rir  != null) rirInput.value  = lastSets[i].rir;
        // Afficher la valeur sauvegardée en grisé (pas validée = éditable)
        kgInput.dataset.saved   = lastSets[i].kg   ?? '';
        repsInput.dataset.saved = lastSets[i].reps ?? '';
      }

      if (draft?.sets?.[i]) {
        const ds = draft.sets[i];
        if (ds.kg !== undefined && ds.kg !== null) kgInput.value = ds.kg;
        if (ds.reps !== undefined && ds.reps !== null) repsInput.value = ds.reps;
        if (ds.rir !== undefined && ds.rir !== null) rirInput.value = ds.rir;
        state.sets[i].kg = kgInput.value;
        state.sets[i].reps = repsInput.value;
        state.sets[i].rir = rirInput.value;
        state.sets[i].validated = !!ds.validated;
        if (state.sets[i].validated) {
          applyValidatedUI(row, validateBtn, statusEl, kgInput, repsInput, rirInput);
        }
      }

      const updateSetState = () => {
        state.sets[i].kg   = kgInput.value;
        state.sets[i].reps = repsInput.value;
        state.sets[i].rir  = rirInput.value;
        saveDraft();
      };

      // Feedback live (indication si changement vs dernière fois)
      const liveUpdate = () => {
        updateSetState();
        if (state.sets[i].validated) return;
        const kg   = kgInput.value;
        const reps = repsInput.value;
        if (!kg && !reps) { statusEl.textContent = ''; statusEl.className = 'clz-set-status'; return; }

        const pr   = this.isPR(session, exName, kg);
        if (pr) {
          statusEl.className   = 'clz-set-status clz-status-pr';
          statusEl.textContent = '🏆';
          return;
        }
        // Comparaison vs dernière fois pour CE set
        if (lastSets[i] && kg) {
          const prevKg  = this.getSetKg(lastSets[i]);
          const currKg  = this.parseKgInput(kg).kg;
          if (prevKg !== '' && currKg !== '') {
            const diff = currKg - prevKg;
            if (diff > 0) {
              statusEl.className   = 'clz-set-status clz-status-up';
              statusEl.textContent = `↑ +${diff}`;
              return;
            } else if (diff < 0) {
              statusEl.className   = 'clz-set-status clz-status-warn';
              statusEl.textContent = `↓ ${diff}`;
              return;
            }
          }
        }
        statusEl.className = 'clz-set-status'; statusEl.textContent = '';
      };

      [kgInput, repsInput, rirInput].forEach(inp => inp.addEventListener('input', liveUpdate));

      // ── Validation d'un set ──
      const validateSet = () => {
        updateSetState();
        const { kg, reps } = state.sets[i];
        if (kg === '' && reps === '') {
          statusEl.className   = 'clz-set-status clz-status-warn';
          statusEl.textContent = '⚠';
          // Shake animation
          row.style.animation = 'none';
          row.offsetHeight;
          row.classList.add('clz-shake');
          setTimeout(() => row.classList.remove('clz-shake'), 400);
          return;
        }
        state.sets[i].validated = true;

        [kgInput, repsInput, rirInput].forEach(inp => {
          inp.readOnly = true;
          inp.classList.add('clz-validated');
        });
        validateBtn.textContent = '✎';
        validateBtn.title       = 'Modifier';
        validateBtn.classList.add('clz-edit-mode');

        const pr   = this.isPR(session, exName, kg);
        const prog = this.getProgressStatus(session, exName, kg, reps);

        if (pr) {
          statusEl.className   = 'clz-set-status clz-status-pr';
          statusEl.textContent = '🏆 PR !';
        } else if (prog?.type === 'up') {
          statusEl.className   = 'clz-set-status clz-status-up';
          statusEl.textContent = `↑ ${prog.msg}`;
        } else if (prog?.type === 'down') {
          statusEl.className   = 'clz-set-status clz-status-down';
          statusEl.textContent = `↓ ${prog.msg}`;
        } else {
          statusEl.className   = 'clz-set-status clz-status-ok';
          statusEl.textContent = '✓';
        }

        // Auto-focus sur le set suivant si disponible
        const nextRow  = setRows[i + 1];
        if (nextRow) {
          const nextKg = nextRow.querySelector('.clz-kg');
          if (nextKg && !nextKg.readOnly) setTimeout(() => nextKg.focus(), 100);
        }

        feedback.className = 'clz-feedback';
        feedback.textContent = 'Auto-save actif · set validé';
        saveDraft();
      };

      // ── Mode édition (déverrouillage) ──
      const editSet = () => {
        state.sets[i].validated = false;
        [kgInput, repsInput, rirInput].forEach(inp => {
          inp.readOnly = false;
          inp.classList.remove('clz-validated');
        });
        validateBtn.textContent = '✓';
        validateBtn.title       = 'Valider ce set';
        validateBtn.classList.remove('clz-edit-mode');
        statusEl.className   = 'clz-set-status';
        statusEl.textContent = '';
        kgInput.focus();

        saveDraft();
      };

      validateBtn.addEventListener('click', () => {
        if (state.sets[i].validated) editSet();
        else validateSet();
        document.dispatchEvent(new CustomEvent('exercise-validation-changed', { detail: { session, exName } }));
      });

      // Enter sur un input → valider le set
      [kgInput, repsInput, rirInput].forEach(inp => {
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); validateSet(); }
        });
      });
    });

    this._registerCardLog({
      session,
      exName,
      isFullyValidated: () => state.sets.every(s => s.validated),
      getSetsToSave: () => state.sets.map(s => {
        const parsed = this.parseKgInput(s.kg);
        return {
          kgRaw: parsed.raw,
          kgResolved: parsed.kg,
          kg: parsed.kg,
          reps: this._int(s.reps),
          rir: this._int(s.rir),
        };
      }).filter(s => s.kg !== '' || s.reps !== ''),
    });
    document.dispatchEvent(new CustomEvent('exercise-validation-changed', { detail: { session, exName } }));
  },

};

/* ── NETTOYAGE À LA FERMETURE ──────────────────────────────── */
window.addEventListener('pagehide', () => {
  T.stopTimer();
  if (T._workoutActive) T.stopWorkout();
});
