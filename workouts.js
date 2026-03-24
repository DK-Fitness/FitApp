/* ═══════════════════════════════════════════════════════════════
   workouts.js — Source de données centrale des séances v2
   Structure normalisée — tous les champs obligatoires présents.
   ─────────────────────────────────────────────────────────────
   Structure obligatoire par exercice :
   {
     name:      string           — nom principal
     nameDetail: string | ''    — précision optionnelle (ex: "(Barre)")
     badge:     string          — tag court affiché sur la card
     muscles:   string          — muscles ciblés (affichés en italique)
     note:      string          — conseil d'exécution affiché dans la card
     restSec:   number          — durée de repos en secondes
     restLabel: string          — durée affichée (ex: "2'30–3'")
     sets:      SetItem[]       — tableau de sets planifiés
   }

   Structure SetItem :
   {
     label:  string  — libellé du set (ex: "S1", "Dégressive")
     charge: string  — charge suggérée (ex: "75 kg", "PDC")
     reps:   string  — plage de reps (ex: "8–10 reps")
     rir:    string  — RIR cible (ex: "RIR 1", "" si finition)
     drop:   boolean — true si série dégressive (optionnel, défaut false)
   }
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
        name:       'Tractions',
        nameDetail: '',
        badge:      'Polyarticulaire · Lourd',
        muscles:    'Grand dorsal · Grand rond · Biceps · Trapèzes inférieurs · Rhomboïdes',
        note:       '👉 Récupération nerveuse maximale — polyarticulaire lourd, priorité performance',
        restSec:    165,
        restLabel:  '2\'30–3\'',
        sets: [
          { label: 'S1',        charge: 'PDC',      reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2',        charge: '+12,5 kg', reps: '6–8 reps',   rir: 'RIR 1–2', drop: false },
          { label: 'S3',        charge: '+17,5 kg', reps: '4–6 reps',   rir: 'RIR 1',   drop: false },
          { label: 'Dégressive',charge: 'PDC',      reps: '6–10 reps',  rir: 'RIR 0–1', drop: true  },
        ],
      },
      {
        name:       'Rowing Machine',
        nameDetail: '(MG3000 neutre)',
        badge:      'Polyarticulaire · Tension',
        muscles:    'Trapèzes moyens · Rhomboïdes · Grand dorsal · Deltoïde postérieur · Biceps',
        note:       '👉 Unilatéral si possible — tension mécanique élevée, maintien de qualité d\'exécution',
        restSec:    135,
        restLabel:  '2\'–2\'30',
        sets: [
          { label: 'S1', charge: '60 kg', reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2', charge: '65 kg', reps: '10–12 reps', rir: 'RIR 1–2', drop: false },
          { label: 'S3', charge: '70 kg', reps: '8–10 reps',  rir: 'RIR 1',   drop: false },
        ],
      },
      {
        name:       'Tirage Vertical',
        nameDetail: '',
        badge:      'Volume · Isolation mixte',
        muscles:    'Grand dorsal · Grand rond · Biceps · Trapèzes inférieurs',
        note:       '👉 Moins nerveux que les tractions → repos légèrement réduit, utilise ton grip habituel',
        restSec:    105,
        restLabel:  '1\'30–2\'',
        sets: [
          { label: 'S1', charge: '65 kg', reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2', charge: '70 kg', reps: '10–12 reps', rir: 'RIR 1–2', drop: false },
          { label: 'S3', charge: '75 kg', reps: '8–10 reps',  rir: 'RIR 1',   drop: false },
        ],
      },
      {
        name:       'Pull-Over',
        nameDetail: '(Poulie)',
        badge:      'Isolation · Grand dorsal',
        muscles:    'Grand dorsal isolé · Grand rond · Dentelé antérieur',
        note:       '👉 Isolation → fatigue locale uniquement, récupération nerveuse rapide',
        restSec:    90,
        restLabel:  '1\'30',
        sets: [
          { label: 'S1', charge: '25 kg',    reps: '12–15 reps', rir: 'RIR 2', drop: false },
          { label: 'S2', charge: '30–35 kg', reps: '12–15 reps', rir: 'RIR 1', drop: false },
        ],
      },
      {
        name:       'Face Pull',
        nameDetail: '(Finition)',
        badge:      'Correctif · Coiffe',
        muscles:    'Deltoïde postérieur · Trapèzes moyens & inférieurs · Coiffe des rotateurs',
        note:       '👉 Exercice léger et correctif — récupération rapide, garde qualité et amplitude max',
        restSec:    75,
        restLabel:  '1\'–1\'30',
        sets: [
          { label: 'S1', charge: '20–25 kg', reps: '15–20 reps', rir: '', drop: false },
          { label: 'S2', charge: '20–25 kg', reps: '15–20 reps', rir: '', drop: false },
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
        name:       'Développé Couché',
        nameDetail: '(Barre)',
        badge:      'Polyarticulaire · Force',
        muscles:    'Grand pectoral · Deltoïde antérieur · Triceps',
        note:       '👉 Exercice roi — priorité performance, récupération nerveuse maximale',
        restSec:    180,
        restLabel:  '3\'–3\'30',
        sets: [
          { label: 'S1',        charge: '60 kg',   reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2',        charge: '75 kg',   reps: '8–10 reps',  rir: 'RIR 1–2', drop: false },
          { label: 'S3',        charge: '82,5 kg', reps: '5–7 reps',   rir: 'RIR 1',   drop: false },
          { label: 'Dégressive',charge: '60 kg',   reps: '8–12 reps',  rir: 'RIR 0–1', drop: true  },
        ],
      },
      {
        name:       'Développé Incliné',
        nameDetail: '(Haltères)',
        badge:      'Polyarticulaire · Volume',
        muscles:    'Grand pectoral faisceau claviculaire · Deltoïde antérieur · Triceps',
        note:       '👉 Focus portion haute du pec — garde angle 30–45°, ne trop verticalise pas',
        restSec:    150,
        restLabel:  '2\'30–3\'',
        sets: [
          { label: 'S1', charge: '22 kg', reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2', charge: '26 kg', reps: '10–12 reps', rir: 'RIR 1–2', drop: false },
          { label: 'S3', charge: '28 kg', reps: '8–10 reps',  rir: 'RIR 1',   drop: false },
        ],
      },
      {
        name:       'Écarté bas→haut',
        nameDetail: '(Câble)',
        badge:      'Isolation · Tension continue',
        muscles:    'Grand pectoral sternal · Faisceau inférieur',
        note:       '👉 Tension maximale en position allongée — ampli complète, ne claque pas en haut',
        restSec:    90,
        restLabel:  '1\'30',
        sets: [
          { label: 'S1', charge: '15 kg', reps: '12–15 reps', rir: 'RIR 2',   drop: false },
          { label: 'S2', charge: '17 kg', reps: '12–15 reps', rir: 'RIR 1–2', drop: false },
          { label: 'S3', charge: '17 kg', reps: '10–12 reps', rir: 'RIR 1',   drop: false },
        ],
      },
      {
        name:       'Écarté neutre',
        nameDetail: '(Câble croisé)',
        badge:      'Isolation · Adduction',
        muscles:    'Grand pectoral · Faisceau moyen',
        note:       '👉 Croise légèrement les mains en fin de mouvement — contraction maximale',
        restSec:    90,
        restLabel:  '1\'30',
        sets: [
          { label: 'S1', charge: '12 kg', reps: '12–15 reps', rir: 'RIR 2', drop: false },
          { label: 'S2', charge: '14 kg', reps: '12–15 reps', rir: 'RIR 1', drop: false },
        ],
      },
      {
        name:       'Élévations Latérales',
        nameDetail: '(Finition)',
        badge:      'Correctif · Deltoïdes',
        muscles:    'Deltoïde médial · Supra-épineux',
        note:       '👉 Léger et contrôlé — coude légèrement fléchi, pouce vers le bas, amplitude max',
        restSec:    60,
        restLabel:  '1\'',
        sets: [
          { label: 'S1', charge: '8 kg',  reps: '15–20 reps', rir: '',       drop: false },
          { label: 'S2', charge: '8 kg',  reps: '15–20 reps', rir: '',       drop: false },
          { label: 'S3', charge: '10 kg', reps: '12–15 reps', rir: 'RIR 1', drop: false },
        ],
      },
    ],
  },

  /* ── À décommenter pour ajouter des séances ────────────────
  jambes: {
    title: 'JAMBES', subtitle: 'Squat · Fémoral · Mollets',
    footer: { sets: '~13 séries', duration: '~70 min', note: 'Squat → très long repos' },
    tips: [],
    exercises: [
      { name: 'Squat', nameDetail: '(Barre)', badge: 'Polyarticulaire · Force', muscles: 'Quadriceps · Fessiers · Ischio-jambiers · Core', note: '', restSec: 210, restLabel: '3\'30–4\'', sets: [] },
      { name: 'Leg Press', nameDetail: '', badge: 'Polyarticulaire · Volume', muscles: 'Quadriceps · Fessiers', note: '', restSec: 150, restLabel: '2\'30', sets: [] },
      { name: 'Leg Curl', nameDetail: '(Couché)', badge: 'Isolation · Fémoral', muscles: 'Ischio-jambiers', note: '', restSec: 90, restLabel: '1\'30', sets: [] },
      { name: 'Leg Extension', nameDetail: '', badge: 'Isolation · Quadriceps', muscles: 'Quadriceps', note: '', restSec: 75, restLabel: '1\'15', sets: [] },
      { name: 'Mollets', nameDetail: '(Machine)', badge: 'Isolation · Mollets', muscles: 'Soléaire · Gastrocnémien', note: '', restSec: 60, restLabel: '1\'', sets: [] },
    ],
  },
  epaules: {
    title: 'ÉPAULES', subtitle: 'Deltoïdes · Coiffe',
    footer: { sets: '~11 séries', duration: '~55 min', note: 'Militaire → long repos · Isolation → court repos' },
    tips: [],
    exercises: [
      { name: 'Développé Militaire', nameDetail: '(Barre)', badge: 'Polyarticulaire · Force', muscles: 'Deltoïde antérieur · Médial · Triceps', note: '', restSec: 180, restLabel: '3\'', sets: [] },
      { name: 'Oiseau', nameDetail: '(Haltères)', badge: 'Isolation · Deltoïde post.', muscles: 'Deltoïde postérieur · Trapèzes moyens', note: '', restSec: 90, restLabel: '1\'30', sets: [] },
      { name: 'Face Pull', nameDetail: '(Câble)', badge: 'Correctif · Coiffe', muscles: 'Coiffe des rotateurs · Trapèzes', note: '', restSec: 75, restLabel: '1\'15', sets: [] },
      { name: 'Élévations Latérales', nameDetail: '(Haltères)', badge: 'Isolation · Deltoïde médial', muscles: 'Deltoïde médial · Supra-épineux', note: '', restSec: 60, restLabel: '1\'', sets: [] },
      { name: 'Shrug', nameDetail: '(Haltères)', badge: 'Isolation · Trapèzes', muscles: 'Trapèzes supérieurs', note: '', restSec: 75, restLabel: '1\'15', sets: [] },
    ],
  },
  ────────────────────────────────────────────────────────── */
};
