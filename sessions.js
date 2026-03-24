/* ═══════════════════════════════════════════════════════════════
   sessions.js — Configuration centrale des séances
   Toute l'app lit cette source. Ne dupliquer nulle part ailleurs.
   ═══════════════════════════════════════════════════════════════ */

const SESSIONS = [
  {
    slug:      'dos',
    icon:      '🔱',
    tag:       'Traction · Rowing',
    exercises: ['Tractions', 'Rowing Machine', 'Tirage Vertical', 'Pull-Over', 'Face Pull'],
  },
  {
    slug:      'pecs',
    icon:      '💪',
    tag:       'Poussée · Volume',
    exercises: ['Dév. couché', 'Dév. incliné', 'Écarté bas→haut', 'Écarté neutre', 'Élév. latérales'],
  },
  // ── À décommenter pour ajouter une séance ──────────────────
  // { slug: 'jambes',  icon: '⚡', tag: 'Squat · Fémoral',    exercises: ['Squat', 'Leg press', 'Leg curl', 'Leg extension', 'Mollets'] },
  // { slug: 'epaules', icon: '🎯', tag: 'Deltoïdes · Coiffe', exercises: ['Développé militaire', 'Oiseau', 'Face pull', 'Élév. latérales', 'Shrug'] },
];
