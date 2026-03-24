/* ═══════════════════════════════════════════════════════════════
   workouts.js — Source de données centrale des séances
   Contient tout le détail : exercices, séries, charges, repos,
   notes, conseils. Ne jamais dupliquer dans le HTML.
   ═══════════════════════════════════════════════════════════════ */

const WORKOUTS = {

  /* ──────────────────────────────────────────────────────────
     DOS
  ────────────────────────────────────────────────────────── */
  dos: {
    title:    'DOS',
    subtitle: 'Traction · Rowing · Isolation',
    footer:   { sets: '~11–12 séries', duration: '~60 min', note: 'Poly → long repos · Isolation → court repos' },
    tips: [
      { icon: '🎯', head: 'Connexion esprit-muscle',  body: 'Pense à contracter le dos avant chaque rep. Visualise le muscle cible, pas le mouvement.' },
      { icon: '🐢', head: 'Contrôle du mouvement',    body: 'Phase excentrique lente (2–3s). Ne balance pas, contrôle chaque centimètre.' },
      { icon: '💨', head: 'Respiration',               body: 'Expire à l\'effort (tirage/traction), inspire au retour. Jamais bloquer.' },
      { icon: '🔄', head: 'Progression (RIR)',         body: 'RIR = reps restantes avant l\'échec. Ajuste la charge pour rester dans la cible.' },
    ],
    exercises: [
      {
        name:    'Tractions',
        badge:   'Polyarticulaire · Lourd',
        muscles: 'Grand dorsal · Grand rond · Biceps · Trapèzes inférieurs · Rhomboïdes',
        note:    '👉 Récupération nerveuse maximale — polyarticulaire lourd, priorité performance',
        restSec: 165,
        restLabel: '2\'30–3\'',
        sets: [
          { label: 'S1', charge: 'PDC',       reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '+12,5 kg',  reps: '6–8 reps',   rir: 'RIR 1–2' },
          { label: 'S3', charge: '+17,5 kg',  reps: '4–6 reps',   rir: 'RIR 1' },
          { label: 'Dégressive', charge: 'PDC', reps: '6–10 reps', rir: 'RIR 0–1', drop: true },
        ],
      },
      {
        name:    'Rowing Machine',
        nameDetail: '(MG3000 neutre)',
        badge:   'Polyarticulaire · Tension',
        muscles: 'Trapèzes moyens · Rhomboïdes · Grand dorsal · Deltoïde postérieur · Biceps',
        note:    '👉 Unilatéral si possible — tension mécanique élevée, maintien de qualité d\'exécution',
        restSec: 135,
        restLabel: '2\'–2\'30',
        sets: [
          { label: 'S1', charge: '60 kg', reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '65 kg', reps: '10–12 reps', rir: 'RIR 1–2' },
          { label: 'S3', charge: '70 kg', reps: '8–10 reps',  rir: 'RIR 1' },
        ],
      },
      {
        name:    'Tirage Vertical',
        badge:   'Volume · Isolation mixte',
        muscles: 'Grand dorsal · Grand rond · Biceps · Trapèzes inférieurs',
        note:    '👉 Moins nerveux que les tractions → repos légèrement réduit, utilise ton grip habituel',
        restSec: 105,
        restLabel: '1\'30–2\'',
        sets: [
          { label: 'S1', charge: '65 kg', reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '70 kg', reps: '10–12 reps', rir: 'RIR 1–2' },
          { label: 'S3', charge: '75 kg', reps: '8–10 reps',  rir: 'RIR 1' },
        ],
      },
      {
        name:    'Pull-Over',
        nameDetail: '(Poulie)',
        badge:   'Isolation · Grand dorsal',
        muscles: 'Grand dorsal isolé · Grand rond · Dentelé antérieur',
        note:    '👉 Isolation → fatigue locale uniquement, récupération nerveuse rapide',
        restSec: 90,
        restLabel: '1\'30',
        sets: [
          { label: 'S1', charge: '25 kg',    reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '30–35 kg', reps: '12–15 reps', rir: 'RIR 1' },
        ],
      },
      {
        name:    'Face Pull',
        nameDetail: '(Finition)',
        badge:   'Correctif · Coiffe',
        muscles: 'Deltoïde postérieur · Trapèzes moyens & inférieurs · Coiffe des rotateurs',
        note:    '👉 Exercice léger et correctif — récupération rapide, garde qualité et amplitude max',
        restSec: 75,
        restLabel: '1\'–1\'30',
        sets: [
          { label: 'S1', charge: '20–25 kg', reps: '15–20 reps', rir: '' },
          { label: 'S2', charge: '20–25 kg', reps: '15–20 reps', rir: '' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     PECS
  ────────────────────────────────────────────────────────── */
  pecs: {
    title:    'PECS',
    subtitle: 'Poussée · Volume · Isolation',
    footer:   { sets: '~12–13 séries', duration: '~65 min', note: 'Poly → long repos · Isolation → court repos' },
    tips: [
      { icon: '🎯', head: 'Rétraction scapulaire',   body: 'Rentre les omoplates avant chaque set. Protège l\'épaule, améliore la transmission de force.' },
      { icon: '🐢', head: 'Contrôle excentrique',    body: 'Descente lente (3s). La croissance se fait à la descente, ne lâche pas.' },
      { icon: '💨', head: 'Respiration',              body: 'Expire en poussant, inspire en descendant. Bloque légèrement pendant l\'effort.' },
      { icon: '🔄', head: 'Connexion pec',            body: 'Pense à "comprimer" la poitrine au lieu de "pousser la barre". Active mieux le grand pectoral.' },
    ],
    exercises: [
      {
        name:    'Développé Couché',
        nameDetail: '(Barre)',
        badge:   'Polyarticulaire · Force',
        muscles: 'Grand pectoral · Deltoïde antérieur · Triceps',
        note:    '👉 Exercice roi — priorité performance, récupération nerveuse maximale',
        restSec: 180,
        restLabel: '3\'–3\'30',
        sets: [
          { label: 'S1', charge: '60 kg',  reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '75 kg',  reps: '8–10 reps',  rir: 'RIR 1–2' },
          { label: 'S3', charge: '82,5 kg', reps: '5–7 reps',  rir: 'RIR 1' },
          { label: 'Dégressive', charge: '60 kg', reps: '8–12 reps', rir: 'RIR 0–1', drop: true },
        ],
      },
      {
        name:    'Développé Incliné',
        nameDetail: '(Haltères)',
        badge:   'Polyarticulaire · Volume',
        muscles: 'Grand pectoral faisceau claviculaire · Deltoïde antérieur · Triceps',
        note:    '👉 Focus portion haute du pec — garde angle 30–45°, ne trop verticalise pas',
        restSec: 150,
        restLabel: '2\'30–3\'',
        sets: [
          { label: 'S1', charge: '22 kg',  reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '26 kg',  reps: '10–12 reps', rir: 'RIR 1–2' },
          { label: 'S3', charge: '28 kg',  reps: '8–10 reps',  rir: 'RIR 1' },
        ],
      },
      {
        name:    'Écarté bas→haut',
        nameDetail: '(Câble)',
        badge:   'Isolation · Tension continue',
        muscles: 'Grand pectoral sternal · Faisceau inférieur',
        note:    '👉 Tension maximale en position allongée — ampli complète, ne claque pas en haut',
        restSec: 90,
        restLabel: '1\'30',
        sets: [
          { label: 'S1', charge: '15 kg', reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '17 kg', reps: '12–15 reps', rir: 'RIR 1–2' },
          { label: 'S3', charge: '17 kg', reps: '10–12 reps', rir: 'RIR 1' },
        ],
      },
      {
        name:    'Écarté neutre',
        nameDetail: '(Câble croisé)',
        badge:   'Isolation · Adduction',
        muscles: 'Grand pectoral · Faisceau moyen',
        note:    '👉 Croise légèrement les mains en fin de mouvement — contraction maximale',
        restSec: 90,
        restLabel: '1\'30',
        sets: [
          { label: 'S1', charge: '12 kg', reps: '12–15 reps', rir: 'RIR 2' },
          { label: 'S2', charge: '14 kg', reps: '12–15 reps', rir: 'RIR 1' },
        ],
      },
      {
        name:    'Élévations Latérales',
        nameDetail: '(Finition)',
        badge:   'Correctif · Deltoïdes',
        muscles: 'Deltoïde médial · Supra-épineux',
        note:    '👉 Léger et contrôlé — coude légèrement fléchi, pouce vers le bas, amplitude max',
        restSec: 60,
        restLabel: '1\'',
        sets: [
          { label: 'S1', charge: '8 kg',  reps: '15–20 reps', rir: '' },
          { label: 'S2', charge: '8 kg',  reps: '15–20 reps', rir: '' },
          { label: 'S3', charge: '10 kg', reps: '12–15 reps', rir: 'RIR 1' },
        ],
      },
    ],
  },

  /* ── Ajouter de nouvelles séances ici ─────────────────────
  jambes: {
    title: 'JAMBES',
    subtitle: 'Squat · Fémoral · Mollets',
    footer: { sets: '~13 séries', duration: '~70 min', note: 'Squat → très long repos' },
    tips: [],
    exercises: [],
  },
  ── */
};
