/* ═══════════════════════════════════════════════════════════════
   training.js — Moteur partagé v3
   ═══════════════════════════════════════════════════════════════
   Modules :
     STORAGE      — lecture / écriture / suppression localStorage
     PARSING      — sanitize kg, reps, rir (rejette NaN / négatif)
     PROGRESSION  — delta, PR, suggestion, volume
     DATA         — export JSON, import JSON, reset
     TIMER        — chrono repos (sans fuite de setInterval)
     WORKOUT      — mode séance (sans double démarrage)
     CARD LOG     — log par set intégré dans les cards d'exercice
   ═══════════════════════════════════════════════════════════════ */

const T = {

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
    if (history.length > 30) history.pop();
    localStorage.setItem(this.storageKey(session, exName), JSON.stringify(history));
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

  /* ════════════════════════════════════════════════════════════
     PROGRESSION
  ════════════════════════════════════════════════════════════ */

  /**
   * Comparaison best set de la nouvelle entrée vs meilleur set du dernier log.
   * kg/reps = valeurs du set validé
   */
  getProgressStatus(session, exName, kg, reps) {
    const last = this.getLast(session, exName);
    if (!last) return null;
    // meilleur set du dernier log
    const lastSets = last.sets || [];
    const kgOld  = lastSets.length ? Math.max(...lastSets.map(s => this._num(s.kg) || 0)) : 0;
    const repOld = lastSets.length ? Math.max(...lastSets.map(s => this._int(s.reps) || 0)) : 0;
    const kgNew  = this._num(kg);
    const repNew = this._int(reps);
    if (kgNew === '') return null;
    const dKg   = kgNew - kgOld;
    const dReps = repNew !== '' ? repNew - repOld : 0;
    if (dKg > 0)   return { type: 'up',    msg: `+${dKg} kg vs dernière fois 🔥` };
    if (dKg < 0)   return { type: 'down',  msg: `${dKg} kg vs dernière fois` };
    if (dReps > 0) return { type: 'up',    msg: `+${dReps} rep(s) vs dernière fois 💪` };
    if (dReps < 0) return { type: 'down',  msg: `${dReps} rep(s) vs dernière fois` };
    return { type: 'equal', msg: 'Même perf que la dernière fois' };
  },

  isPR(session, exName, kg) {
    const kgNum = this._num(kg);
    if (kgNum === '' || kgNum <= 0) return false;
    const history = this.getHistory(session, exName);
    if (!history.length) return false;
    const allKgs = history.flatMap(h => (h.sets || []).map(s => this._num(s.kg) || 0));
    return kgNum > Math.max(...allKgs);
  },

  getBestKg(session, exName) {
    const vals = this.getHistory(session, exName)
      .flatMap(h => (h.sets || []).map(s => this._num(s.kg)))
      .filter(v => v !== '' && v > 0);
    return vals.length ? Math.max(...vals) : null;
  },

  getBestSet(session, exName) {
    // meilleur set = plus haut volume (kg × reps) dans toute l'histoire
    let best = null, bestVol = 0;
    this.getHistory(session, exName).forEach(h => {
      (h.sets || []).forEach(s => {
        const v = (this._num(s.kg) || 0) * (this._int(s.reps) || 0);
        if (v > bestVol) { bestVol = v; best = s; }
      });
    });
    return best;
  },

  getNextSuggestion(session, exName) {
    const last = this.getLast(session, exName);
    if (!last) return null;
    // Prend le dernier set validé (rir le plus bas = set le plus intense)
    const sets = last.sets || [];
    if (!sets.length) return null;
    const heaviest = sets.reduce((a, b) => (this._num(b.kg) || 0) > (this._num(a.kg) || 0) ? b : a, sets[0]);
    const kg  = this._num(heaviest.kg);
    const rir = this._int(heaviest.rir);
    if (kg === '') return null;
    if (rir === '' || rir <= 1) return `Suggéré : +2.5 kg → ${(kg + 2.5).toFixed(1)} kg`;
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
        return s + (this._num(set.kg) || 0) * (this._int(set.reps) || 0);
      }, 0);
    }, 0);
  },

  /* ════════════════════════════════════════════════════════════
     DATA — export / import / reset global
  ════════════════════════════════════════════════════════════ */

  exportJSON() {
    const data = {};
    this._allLogKeys().forEach(key => {
      try { data[key] = JSON.parse(localStorage.getItem(key)); } catch {}
    });
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
            if (key.startsWith('log_') && Array.isArray(value)) {
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
    return keys.length;
  },

  /* ════════════════════════════════════════════════════════════
     TIMER — chrono repos
     • _timerRemaining est une propriété de T → addTime() peut
       la modifier sans closure
     • stopTimer() nettoie toujours proprement
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
        'padding:16px 22px;min-width:160px',
        'box-shadow:0 8px 40px rgba(232,57,14,.3)',
        "font-family:'DM Sans',sans-serif",
      ].join(';');
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#e8390e;font-weight:700;margin-bottom:6px;">⏱ REPOS — ${label}</div>
      <div id="timer-countdown" style="font-family:'Bebas Neue',sans-serif;font-size:52px;color:#f0f0f0;line-height:1;text-align:center;"></div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button onclick="T.stopTimer()" style="flex:1;background:rgba(232,57,14,.15);border:1px solid rgba(232,57,14,.4);color:#e8390e;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;font-weight:700;">✕ Stop</button>
        <button onclick="T.addTime(30)"  style="flex:1;background:rgba(255,255,255,.05);border:1px solid #2a2a2a;color:#888;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;">+30s</button>
      </div>`;

    const tick = () => {
      const el = document.getElementById('timer-countdown');
      if (!el) { this.stopTimer(); return; }
      const r = this._timerRemaining;
      el.textContent = `${Math.floor(r / 60)}:${(r % 60).toString().padStart(2, '0')}`;
      el.style.color = r <= 10 ? '#e8390e' : '#f0f0f0';
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
     • startWorkout() vérifie _workoutActive → pas de double démarrage
     • _elapsedInterval stocké pour être clearInterval() à l'arrêt
  ════════════════════════════════════════════════════════════ */

  _workoutActive:    false,
  _currentExIdx:     0,
  _exCards:          [],
  _workoutStartTime: null,
  _elapsedInterval:  null,

  startWorkout() {
    if (this._workoutActive) return;
    this._workoutActive    = true;
    this._currentExIdx     = 0;
    this._exCards          = Array.from(document.querySelectorAll('.ex-card'));
    this._workoutStartTime = Date.now();

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
        <button onclick="T.nextExercise()" style="background:#e8390e;border:none;color:white;padding:7px 16px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:1px;">EXO SUIVANT →</button>
        <button onclick="T.stopWorkout()"  style="background:rgba(255,255,255,.06);border:1px solid #333;color:#888;padding:7px 14px;border-radius:4px;font-size:12px;cursor:pointer;">✕ Fin</button>
      </div>`;
    document.body.prepend(bar);
    document.body.style.paddingTop = '56px';

    if (this._elapsedInterval) clearInterval(this._elapsedInterval);
    this._elapsedInterval = setInterval(() => {
      const el = document.getElementById('workout-elapsed');
      if (!el) { clearInterval(this._elapsedInterval); return; }
      const s = Math.floor((Date.now() - this._workoutStartTime) / 1000);
      el.textContent = `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')} écoulé`;
    }, 1000);

    this._highlightExercise(0);
  },

  _highlightExercise(idx) {
    this._exCards.forEach((c, i) => {
      c.style.opacity         = i === idx ? '1' : '0.35';
      c.style.borderLeftColor = i === idx ? '#ff6b35' : '';
      c.style.transform       = i === idx ? 'scale(1.01)' : '';
      c.style.transition      = 'all .3s';
    });
    this._exCards[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const el = document.getElementById('workout-expos');
    if (el) el.textContent = `Exo ${idx + 1} / ${this._exCards.length}`;
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
      const elapsed = Date.now() - this._workoutStartTime;
      this.stopWorkout();
      const s    = Math.floor(elapsed / 1000);
      const done = document.createElement('div');
      done.style.cssText = "position:fixed;inset:0;background:rgba(13,13,13,.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;";
      done.innerHTML = `
        <div style="font-size:80px;margin-bottom:16px;">🏆</div>
        <div style="font-size:64px;color:#e8390e;letter-spacing:4px;">SÉANCE</div>
        <div style="font-size:64px;color:#f0f0f0;letter-spacing:4px;">TERMINÉE</div>
        <div style="font-size:18px;color:#888;margin-top:12px;font-family:'DM Sans',sans-serif;">${Math.floor(s / 60)} min ${s % 60} s</div>
        <button onclick="this.parentElement.remove()" style="margin-top:28px;background:#e8390e;border:none;color:white;padding:12px 32px;border-radius:6px;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;cursor:pointer;">FERMER</button>`;
      document.body.appendChild(done);
    }
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
  },

  /* ════════════════════════════════════════════════════════════
     CARD LOG — log par set intégré dans les cards d'exercice
     ───────────────────────────────────────────────────────────
     État distinct :
       • "en cours d'édition" → champs input (state dans le DOM)
       • "validé" → entrée persistée dans localStorage
     Une validation ne peut être que explicite (bouton "Valider set").
     Modification possible après validation (bouton "Modifier").
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

    // Zone log (wrapper injecté dans .ex-body)
    const zone = document.createElement('div');
    zone.className = 'card-log-zone';

    // ── Infos contextuelles (dernière perf + suggestion) ──
    let ctxHtml = '';
    if (lastDate && lastSets.length) {
      const summary = lastSets.map(s =>
        `${s.kg ? s.kg + ' kg' : '—'} × ${s.reps ? s.reps + ' r' : '—'}`
      ).join(' · ');
      ctxHtml += `<div class="clz-last">📅 ${lastDate} — ${summary}</div>`;
    } else {
      ctxHtml += `<div class="clz-last clz-new">Première donnée</div>`;
    }
    if (bestKg) ctxHtml += `<div class="clz-pr">🏆 PR : ${bestKg} kg</div>`;
    if (suggestion) ctxHtml += `<div class="clz-suggest">${suggestion}</div>`;

    // ── Rows de sets à loguer ──
    let setsHtml = '';
    planSets.forEach((s, i) => {
      setsHtml += `
        <div class="clz-set-row" data-set-idx="${i}" data-ex="${exName}">
          <span class="clz-set-label">${s.label}</span>
          <div class="clz-fields">
            <input class="clz-input clz-kg"   type="number" step="0.5" min="0" placeholder="${s.charge || 'kg'}"  inputmode="decimal">
            <span class="clz-sep">×</span>
            <input class="clz-input clz-reps" type="number"             min="0" placeholder="${s.reps  || 'reps'}" inputmode="numeric">
            <span class="clz-sep clz-sep-rir">RIR</span>
            <input class="clz-input clz-rir"  type="number" max="5"     min="0" placeholder="${s.rir   || '—'}"    inputmode="numeric">
          </div>
          <button class="clz-validate-btn" title="Valider ce set">✓</button>
          <span class="clz-set-status"></span>
        </div>`;
    });

    zone.innerHTML = `
      <div class="clz-context">${ctxHtml}</div>
      <div class="clz-sets">${setsHtml}</div>
      <div class="clz-footer">
        <button class="clz-save-all-btn">💾 Valider l'exercice</button>
        <span class="clz-feedback"></span>
      </div>`;

    card.querySelector('.ex-body').appendChild(zone);

    // ── État interne de l'exercice pour cette card ──
    const state = {
      sets:      planSets.map(() => ({ kg: '', reps: '', rir: '', validated: false })),
      saved:     false,
    };

    const setRows   = zone.querySelectorAll('.clz-set-row');
    const saveAllBtn = zone.querySelector('.clz-save-all-btn');
    const feedback   = zone.querySelector('.clz-feedback');

    // ── Wiring par set ──
    setRows.forEach((row, i) => {
      const kgInput   = row.querySelector('.clz-kg');
      const repsInput = row.querySelector('.clz-reps');
      const rirInput  = row.querySelector('.clz-rir');
      const validateBtn = row.querySelector('.clz-validate-btn');
      const statusEl  = row.querySelector('.clz-set-status');

      // Pré-rempli depuis dernier log si disponible
      if (lastSets[i]) {
        kgInput.value   = lastSets[i].kg   ?? '';
        repsInput.value = lastSets[i].reps ?? '';
        rirInput.value  = lastSets[i].rir  ?? '';
      }

      const updateSetState = () => {
        state.sets[i].kg   = kgInput.value;
        state.sets[i].reps = repsInput.value;
        state.sets[i].rir  = rirInput.value;
      };

      // Feedback live à la saisie (pas encore validé)
      const liveUpdate = () => {
        updateSetState();
        if (state.sets[i].validated) return; // déjà validé, pas de feedback live
        const kg   = kgInput.value;
        const reps = repsInput.value;
        const pr   = this.isPR(session, exName, kg);
        if (pr) {
          statusEl.className = 'clz-set-status clz-status-pr';
          statusEl.textContent = '🏆 PR';
        } else if (kg || reps) {
          statusEl.className = 'clz-set-status';
          statusEl.textContent = '';
        }
      };

      [kgInput, repsInput, rirInput].forEach(inp => inp.addEventListener('input', liveUpdate));

      // ── Validation d'un set ──
      const validateSet = () => {
        updateSetState();
        const { kg, reps } = state.sets[i];
        if (kg === '' && reps === '') {
          statusEl.className = 'clz-set-status clz-status-warn';
          statusEl.textContent = '⚠ Vide';
          return;
        }
        state.sets[i].validated = true;

        // Verrouille les champs
        [kgInput, repsInput, rirInput].forEach(inp => {
          inp.readOnly = true;
          inp.classList.add('clz-validated');
        });
        validateBtn.textContent = '✎';
        validateBtn.title       = 'Modifier ce set';
        validateBtn.classList.add('clz-edit-mode');

        const pr   = this.isPR(session, exName, kg);
        const prog = this.getProgressStatus(session, exName, kg, reps);
        let statusText = '✓';
        if (pr) statusText = '🏆 PR !';
        else if (prog && prog.type === 'up') statusText = '↑ ' + prog.msg;
        statusEl.className = pr ? 'clz-set-status clz-status-pr' : (prog?.type === 'up' ? 'clz-set-status clz-status-up' : 'clz-set-status clz-status-ok');
        statusEl.textContent = statusText;

        feedback.className = 'clz-feedback';
        feedback.textContent = '';
      };

      // ── Mode édition (déverrouillage après validation) ──
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
      };

      validateBtn.addEventListener('click', () => {
        if (state.sets[i].validated) editSet();
        else validateSet();
      });
    });

    // ── Valider tout l'exercice (sauvegarde storage) ──
    saveAllBtn.addEventListener('click', () => {
      const setsToSave = state.sets.map(s => ({
        kg:   this._num(s.kg),
        reps: this._int(s.reps),
        rir:  this._int(s.rir),
      })).filter(s => s.kg !== '' || s.reps !== '');

      if (!setsToSave.length) {
        feedback.className   = 'clz-feedback clz-fb-warn';
        feedback.textContent = '⚠ Aucune donnée à sauvegarder';
        return;
      }

      this.saveLog(session, exName, { date: new Date().toISOString(), sets: setsToSave });
      state.saved = true;

      // Met à jour les contextuels
      const newLast = this.getLast(session, exName);
      if (newLast) {
        const d = new Date(newLast.date).toLocaleDateString('fr-FR');
        const summary = (newLast.sets || []).map(s => `${s.kg ? s.kg + ' kg' : '—'} × ${s.reps ? s.reps + ' r' : '—'}`).join(' · ');
        zone.querySelector('.clz-last').innerHTML = `📅 ${d} — ${summary}`;
        zone.querySelector('.clz-last').classList.remove('clz-new');
      }
      const newBest = this.getBestKg(session, exName);
      let prEl = zone.querySelector('.clz-pr');
      if (newBest) {
        if (!prEl) { prEl = document.createElement('div'); prEl.className = 'clz-pr'; zone.querySelector('.clz-context').appendChild(prEl); }
        prEl.textContent = `🏆 PR : ${newBest} kg`;
      }

      feedback.className   = 'clz-feedback clz-fb-ok';
      feedback.textContent = `✓ Sauvegardé (${setsToSave.length} set${setsToSave.length > 1 ? 's' : ''})`;
      saveAllBtn.textContent = '✓ Exercice validé';
      saveAllBtn.classList.add('clz-saved');
      setTimeout(() => { feedback.textContent = ''; feedback.className = 'clz-feedback'; }, 3000);

      // Dispatch pour que la page puisse rafraîchir stats
      document.dispatchEvent(new CustomEvent('exercise-saved', { detail: { session, exName } }));
    });
  },

};

/* ── NETTOYAGE À LA FERMETURE DE PAGE ─────────────────────── */
window.addEventListener('pagehide', () => {
  T.stopTimer();
  if (T._workoutActive) T.stopWorkout();
});
