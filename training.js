/* ═══════════════════════════════════════════════════════════════
   training.js — Moteur partagé v2
   ═══════════════════════════════════════════════════════════════
   Modules :
     STORAGE      — lecture / écriture / suppression localStorage
     PARSING      — sanitize kg, reps, rir (rejette NaN / négatif)
     PROGRESSION  — delta, PR, suggestion, volume
     DATA         — export JSON, import JSON, reset
     TIMER        — chrono repos (sans fuite de setInterval)
     WORKOUT      — mode séance (sans double démarrage)
     LOG UI       — tableau de log interactif
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

  saveLog(session, exName, data) {
    const history = this.getHistory(session, exName);
    history.unshift({
      date: new Date().toISOString(),
      kg:   this._num(data.kg),
      reps: this._int(data.reps),
      rir:  this._int(data.rir),
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

  getProgressStatus(session, exName, kg, reps) {
    const last = this.getLast(session, exName);
    if (!last) return null;
    const kgNew  = this._num(kg);
    const kgOld  = this._num(last.kg) || 0;
    const repNew = this._int(reps);
    const repOld = this._int(last.reps) || 0;
    if (kgNew === '') return null;
    const dKg   = kgNew  - kgOld;
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
    return kgNum > Math.max(...history.map(h => this._num(h.kg) || 0));
  },

  getBestKg(session, exName) {
    const vals = this.getHistory(session, exName)
      .map(h => this._num(h.kg))
      .filter(v => v !== '' && v > 0);
    return vals.length ? Math.max(...vals) : null;
  },

  getNextSuggestion(session, exName) {
    const last = this.getLast(session, exName);
    if (!last || last.kg === '') return null;
    const kg  = this._num(last.kg);
    const rir = this._int(last.rir);
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
      const kg   = this._num(h[entryIndex].kg)   || 0;
      const reps = this._int(h[entryIndex].reps) || 0;
      return sum + kg * reps;
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
    this.stopTimer();                          // nettoie l'éventuel timer précédent
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
    if (this._workoutActive) return;           // ← protège contre double clic
    this._workoutActive    = true;
    this._currentExIdx     = 0;
    this._exCards          = Array.from(document.querySelectorAll('.ex-card'));
    this._workoutStartTime = Date.now();

    /* Supprime une éventuelle barre résiduelle */
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
        <button onclick="T.nextExercise()" style="background:#e8390e;border:none;color:white;padding:7px 16px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:1px;">EXO SUIVANT →</button>
        <button onclick="T.stopWorkout()"  style="background:rgba(255,255,255,.06);border:1px solid #333;color:#888;padding:7px 14px;border-radius:4px;font-size:12px;cursor:pointer;">✕ Fin</button>
      </div>`;
    document.body.prepend(bar);
    document.body.style.paddingTop = '56px';

    /* Chronomètre séance — stocké pour pouvoir être stoppé */
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
     LOG UI
     • IDs basés sur l'index (ex0, ex1…) pour éviter les caractères
       spéciaux dans les noms d'exercices (accents, →, etc.)
     • Bouton 🗑 par ligne — confirmation + refresh complet
     • Feedback live : PR en or, progression en vert/rouge
     • Date+heure de la dernière entrée visible dans la colonne statut
  ════════════════════════════════════════════════════════════ */

  initLogTable(sessionName, exercises) {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    exercises.forEach((exName, idx) => {
      const last       = this.getLast(sessionName, exName);
      const suggestion = this.getNextSuggestion(sessionName, exName);
      const id         = `_ex${idx}`;           // ID DOM sans caractères spéciaux

      const lKg   = (last && last.kg   !== '') ? last.kg   : '';
      const lReps = (last && last.reps !== '') ? last.reps : '';
      const lRir  = (last && last.rir  !== '') ? last.rir  : '';
      const lDate = last ? new Date(last.date).toLocaleDateString('fr-FR') : '';

      const row = document.createElement('tr');
      row.dataset.ex = exName;
      row.innerHTML = `
        <td class="log-ex-name">${exName}</td>
        <td><input class="log-input" id="kg${id}"   type="number" step="0.5" min="0" placeholder="${lKg   || 'kg'}"   value="${lKg}"></td>
        <td><input class="log-input" id="reps${id}" type="number"             min="0" placeholder="${lReps || 'reps'}" value="${lReps}"></td>
        <td><input class="log-input" id="rir${id}"  type="number" max="5"     min="0" placeholder="${lRir  || 'RIR'}"  value="${lRir}"></td>
        <td class="log-status" id="status${id}">
          ${last
            ? `<span class="log-prev">${lDate} · ${lKg}kg × ${lReps}r</span>`
            : `<span class="log-new">Première donnée</span>`}
          ${suggestion ? `<div class="log-suggest">${suggestion}</div>` : ''}
        </td>
        <td class="log-actions">
          ${last ? `<button class="log-del-btn" title="Supprimer le dernier log">🗑</button>` : ''}
        </td>`;
      tbody.appendChild(row);

      /* ── Bouton supprimer ── */
      const delBtn = row.querySelector('.log-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          const entry = this.getLast(sessionName, exName);
          if (!entry) return;
          const d = new Date(entry.date).toLocaleDateString('fr-FR');
          if (!confirm(`Supprimer le log du ${d} pour "${exName}" ?\n${entry.kg} kg × ${entry.reps} reps`)) return;
          this.deleteLastLog(sessionName, exName);
          this.initLogTable(sessionName, exercises);  // refresh complet
        });
      }

      /* ── Feedback live sur saisie ── */
      ['kg', 'reps', 'rir'].forEach(field => {
        const input = document.getElementById(`${field}${id}`);
        if (!input) return;
        input.addEventListener('input', () => {
          const kg       = document.getElementById(`kg${id}`)?.value;
          const reps     = document.getElementById(`reps${id}`)?.value;
          const statusEl = document.getElementById(`status${id}`);
          if (!statusEl) return;
          const prog = this.getProgressStatus(sessionName, exName, kg, reps);
          const pr   = this.isPR(sessionName, exName, kg);
          let html   = '';
          if (pr)   html += `<span class="log-pr">🏆 PR !</span>`;
          if (prog) html += `<span class="log-delta ${prog.type}">${prog.msg}</span>`;
          if (!html && last) html = `<span class="log-prev">${lDate} · ${lKg}kg × ${lReps}r</span>`;
          if (suggestion) html += `<div class="log-suggest">${suggestion}</div>`;
          statusEl.innerHTML = html;
        });
      });
    });
  },

  saveAllLogs(sessionName, exercises) {
    let saved = 0;
    exercises.forEach((exName, idx) => {
      const id   = `_ex${idx}`;
      const kg   = document.getElementById(`kg${id}`)?.value;
      const reps = document.getElementById(`reps${id}`)?.value;
      const rir  = document.getElementById(`rir${id}`)?.value;
      if (kg !== '' || reps !== '') {
        this.saveLog(sessionName, exName, { kg, reps, rir });
        saved++;
      }
    });
    return saved;
  },
};

/* ── NETTOYAGE À LA FERMETURE DE PAGE ─────────────────────── */
window.addEventListener('pagehide', () => {
  T.stopTimer();
  if (T._workoutActive) T.stopWorkout();
});
