const EXERCISE_LIBRARY = [
  // Pectoraux
  { name: "Developpe couche barre", muscle: "pectoraux", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 180 },
  { name: "Developpe incline halteres", muscle: "pectoraux", equipment: "halteres", variant: "libre bilaterale", defaultRestSec: 150 },
  { name: "Developpe decline barre", muscle: "pectoraux", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 150 },
  { name: "Chest press machine", muscle: "pectoraux", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 120 },
  { name: "Ecarte poulie vis-a-vis", muscle: "pectoraux", equipment: "poulie", variant: "cable bilaterale", defaultRestSec: 90 },
  { name: "Ecarte incline halteres", muscle: "pectoraux", equipment: "halteres", variant: "libre bilaterale", defaultRestSec: 90 },
  { name: "Dips buste penche", muscle: "pectoraux", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 120 },
  { name: "Pompes classiques", muscle: "pectoraux", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Pompes declinees", muscle: "pectoraux", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Pull over haltere", muscle: "pectoraux", equipment: "halteres", variant: "libre bilaterale", defaultRestSec: 90 },

  // Dos
  { name: "Tractions pronation", muscle: "dos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 150 },
  { name: "Tractions supination", muscle: "dos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 150 },
  { name: "Tirage vertical prise large", muscle: "dos", equipment: "poulie", variant: "guide bilaterale", defaultRestSec: 120 },
  { name: "Rowing barre buste penche", muscle: "dos", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 150 },
  { name: "Rowing haltere unilaterale", muscle: "dos", equipment: "halteres", variant: "unilaterale", defaultRestSec: 120 },
  { name: "Rowing machine convergente", muscle: "dos", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 120 },
  { name: "Tirage horizontal poulie", muscle: "dos", equipment: "poulie", variant: "cable bilaterale", defaultRestSec: 120 },
  { name: "Pull over poulie haute", muscle: "dos", equipment: "poulie", variant: "cable bilaterale", defaultRestSec: 90 },
  { name: "Face pull corde", muscle: "dos", equipment: "corde", variant: "cable bilaterale", defaultRestSec: 75 },
  { name: "Souleve de terre", muscle: "dos", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 210 },

  // Epaules
  { name: "Developpe militaire barre", muscle: "epaules", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 150 },
  { name: "Developpe assis halteres", muscle: "epaules", equipment: "halteres", variant: "libre bilaterale", defaultRestSec: 120 },
  { name: "Elevation laterale halteres", muscle: "epaules", equipment: "halteres", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Elevation laterale poulie unilaterale", muscle: "epaules", equipment: "poulie", variant: "unilaterale", defaultRestSec: 75 },
  { name: "Oiseau banc incline", muscle: "epaules", equipment: "halteres", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Reverse fly machine", muscle: "epaules", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Arnold press", muscle: "epaules", equipment: "halteres", variant: "bilaterale", defaultRestSec: 120 },
  { name: "Shrug barre", muscle: "epaules", equipment: "barre", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Shrug halteres", muscle: "epaules", equipment: "halteres", variant: "bilaterale", defaultRestSec: 90 },

  // Biceps
  { name: "Curl barre droite", muscle: "biceps", equipment: "barre", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Curl barre EZ", muscle: "biceps", equipment: "barre", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Curl incline halteres", muscle: "biceps", equipment: "halteres", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Curl pupitre barre EZ", muscle: "biceps", equipment: "barre", variant: "guide", defaultRestSec: 90 },
  { name: "Curl marteau halteres", muscle: "biceps", equipment: "halteres", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Curl marteau corde", muscle: "biceps", equipment: "corde", variant: "cable bilaterale", defaultRestSec: 75 },
  { name: "Curl unilaterale poulie basse", muscle: "biceps", equipment: "poulie", variant: "unilaterale", defaultRestSec: 75 },
  { name: "Curl concentration", muscle: "biceps", equipment: "halteres", variant: "unilaterale", defaultRestSec: 75 },
  { name: "Curl spider banc incline", muscle: "biceps", equipment: "barre", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Curl machine", muscle: "biceps", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },

  // Triceps
  { name: "Barre front", muscle: "triceps", equipment: "barre", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Extension triceps corde", muscle: "triceps", equipment: "corde", variant: "cable bilaterale", defaultRestSec: 75 },
  { name: "Extension triceps un bras poulie", muscle: "triceps", equipment: "poulie", variant: "unilaterale", defaultRestSec: 75 },
  { name: "Dips banc", muscle: "triceps", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Developpe serre barre", muscle: "triceps", equipment: "barre", variant: "bilaterale", defaultRestSec: 120 },
  { name: "Skull crusher halteres", muscle: "triceps", equipment: "halteres", variant: "bilaterale", defaultRestSec: 90 },
  { name: "Triceps machine", muscle: "triceps", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Kickback haltere", muscle: "triceps", equipment: "halteres", variant: "unilaterale", defaultRestSec: 60 },

  // Jambes
  { name: "Squat barre", muscle: "jambes", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 210 },
  { name: "Front squat", muscle: "jambes", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 180 },
  { name: "Leg press", muscle: "jambes", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 150 },
  { name: "Fentes marchees halteres", muscle: "jambes", equipment: "halteres", variant: "unilaterale", defaultRestSec: 120 },
  { name: "Bulgarian split squat", muscle: "jambes", equipment: "halteres", variant: "unilaterale", defaultRestSec: 120 },
  { name: "Souleve de terre roumain", muscle: "jambes", equipment: "barre", variant: "libre bilaterale", defaultRestSec: 150 },
  { name: "Leg curl couche", muscle: "jambes", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 90 },
  { name: "Leg extension", muscle: "jambes", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 90 },
  { name: "Hack squat", muscle: "jambes", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 150 },
  { name: "Presse unilaterale", muscle: "jambes", equipment: "machine", variant: "unilaterale", defaultRestSec: 120 },
  { name: "Fentes arriere", muscle: "jambes", equipment: "poids du corps", variant: "unilaterale", defaultRestSec: 90 },
  { name: "Sissy squat", muscle: "jambes", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 75 },

  // Abdos
  { name: "Crunch au sol", muscle: "abdos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 45 },
  { name: "Crunch poulie haute", muscle: "abdos", equipment: "poulie", variant: "cable bilaterale", defaultRestSec: 60 },
  { name: "Releve de jambes suspendu", muscle: "abdos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 60 },
  { name: "Releve de bassin", muscle: "abdos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 45 },
  { name: "Planche", muscle: "abdos", equipment: "poids du corps", variant: "isometrique", defaultRestSec: 45 },
  { name: "Russian twist medecine ball", muscle: "abdos", equipment: "halteres", variant: "bilaterale", defaultRestSec: 45 },
  { name: "Ab wheel", muscle: "abdos", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 60 },

  // Fessiers
  { name: "Hip thrust barre", muscle: "fessiers", equipment: "barre", variant: "bilaterale", defaultRestSec: 150 },
  { name: "Glute bridge", muscle: "fessiers", equipment: "poids du corps", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Kickback poulie", muscle: "fessiers", equipment: "poulie", variant: "unilaterale", defaultRestSec: 60 },
  { name: "Abduction machine", muscle: "fessiers", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Fentes laterales", muscle: "fessiers", equipment: "halteres", variant: "unilaterale", defaultRestSec: 90 },
  { name: "Step up halteres", muscle: "fessiers", equipment: "halteres", variant: "unilaterale", defaultRestSec: 90 },

  // Avant-bras
  { name: "Curl poignets barre", muscle: "avant-bras", equipment: "barre", variant: "bilaterale", defaultRestSec: 60 },
  { name: "Extension poignets barre", muscle: "avant-bras", equipment: "barre", variant: "bilaterale", defaultRestSec: 60 },
  { name: "Farmer walk", muscle: "avant-bras", equipment: "halteres", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Reverse curl barre EZ", muscle: "avant-bras", equipment: "barre", variant: "bilaterale", defaultRestSec: 75 },
  { name: "Pronations supinations haltere", muscle: "avant-bras", equipment: "halteres", variant: "unilaterale", defaultRestSec: 45 },

  // Mollets
  { name: "Mollets debout machine", muscle: "mollets", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Mollets assis machine", muscle: "mollets", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Mollets a la presse", muscle: "mollets", equipment: "machine", variant: "guide bilaterale", defaultRestSec: 75 },
  { name: "Mollets unilateraux au poids du corps", muscle: "mollets", equipment: "poids du corps", variant: "unilaterale", defaultRestSec: 60 },
  { name: "Mollets debout halteres", muscle: "mollets", equipment: "halteres", variant: "bilaterale", defaultRestSec: 60 }
];
