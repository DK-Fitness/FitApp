/* Cloud layer: Firebase Auth + Firestore sync */
(function () {
  const state = {
    ready: false,
    authReady: false,
    user: null,
    db: null,
    auth: null
  };

  function hasFirebaseConfig() {
    return !!(window.FITAPP_FIREBASE_CONFIG && window.firebase);
  }

  function ensureInit() {
    if (!hasFirebaseConfig()) return false;
    if (state.ready) return true;
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(window.FITAPP_FIREBASE_CONFIG);
    state.auth = firebase.auth(app);
    state.db = firebase.firestore(app);
    try { state.db.enablePersistence({ synchronizeTabs: true }); } catch {}
    state.ready = true;
    return true;
  }

  function requireInit() {
    if (!ensureInit()) throw new Error("Firebase non configuré");
  }

  function userDoc() {
    if (!state.user) throw new Error("Utilisateur non connecté");
    return state.db.collection("users").doc(state.user.uid);
  }

  async function mergeCloudIntoLocal() {
    if (!state.user) return;
    const base = userDoc();
    const profileSnap = await base.collection("meta").doc("profile").get();
    if (profileSnap.exists && window.T) {
      window.T.saveProfile(profileSnap.data() || {});
    }

    const logsSnap = await base.collection("logs").get();
    logsSnap.forEach(doc => {
      const data = doc.data() || {};
      if (!window.T || !data.session || !data.exName || !Array.isArray(data.history)) return;
      const key = window.T.storageKey(data.session, data.exName);
      const local = JSON.parse(localStorage.getItem(key) || "[]");
      const merged = [...data.history, ...local].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);
      localStorage.setItem(key, JSON.stringify(merged));
    });

    const wsSnap = await base.collection("meta").doc("workout_sessions").get();
    if (wsSnap.exists && window.T) {
      const cloudSessions = wsSnap.data()?.items || [];
      const local = window.T.getWorkoutSessions();
      const merged = [...cloudSessions, ...local]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 500);
      window.T.saveWorkoutSessions(merged);
    }
  }

  async function pushLocalToCloud() {
    if (!state.user || !window.T) return;
    const base = userDoc();
    const profile = window.T.getProfile();
    await base.collection("meta").doc("profile").set(profile || {}, { merge: true });

    const logKeys = window.T._allLogKeys ? window.T._allLogKeys() : [];
    for (const key of logKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const m = key.match(/^log_([^_]+)_(.+)$/);
      if (!m) continue;
      const session = m[1];
      const exSlug = m[2];
      const history = JSON.parse(raw || "[]");
      await base.collection("logs").doc(key).set({
        key, session, exName: exSlug.replace(/_/g, " "), history,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    await base.collection("meta").doc("workout_sessions").set({
      items: window.T.getWorkoutSessions(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function saveProfile(profile) {
    if (!state.user) return;
    await userDoc().collection("meta").doc("profile").set(profile || {}, { merge: true });
  }

  async function saveLog(session, exName, history) {
    if (!state.user) return;
    const key = window.T.storageKey(session, exName);
    await userDoc().collection("logs").doc(key).set({
      key, session, exName, history,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function saveWorkoutSessions(items) {
    if (!state.user) return;
    await userDoc().collection("meta").doc("workout_sessions").set({
      items: items || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function signInGoogle() {
    requireInit();
    const provider = new firebase.auth.GoogleAuthProvider();
    await state.auth.signInWithPopup(provider);
  }

  async function signUpEmail(email, password) {
    requireInit();
    await state.auth.createUserWithEmailAndPassword(email, password);
  }

  async function signInEmail(email, password) {
    requireInit();
    await state.auth.signInWithEmailAndPassword(email, password);
  }

  async function signOut() {
    requireInit();
    await state.auth.signOut();
  }

  function onAuthChanged(cb) {
    if (!ensureInit()) {
      cb(null);
      return () => {};
    }
    return state.auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      state.authReady = true;
      if (state.user) {
        try {
          await mergeCloudIntoLocal();
          await pushLocalToCloud();
        } catch {}
      }
      cb(state.user);
    });
  }

  function requireAuthOrRedirect() {
    if (!ensureInit()) return;
    onAuthChanged((user) => {
      const onAuthPage = location.pathname.toLowerCase().endsWith("/auth.html");
      if (!user && !onAuthPage) {
        location.href = "auth.html";
      }
      if (user && onAuthPage) {
        location.href = "index.html";
      }
    });
  }

  window.C = {
    ensureInit,
    onAuthChanged,
    requireAuthOrRedirect,
    signInGoogle,
    signInEmail,
    signUpEmail,
    signOut,
    saveProfile,
    saveLog,
    saveWorkoutSessions,
    pushLocalToCloud
  };
})();
