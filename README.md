# FitApp

Application fitness web avec:
- Authentification Firebase (Google OAuth2 + Email/Mot de passe)
- Stockage cloud Firestore + persistance offline + sync multi-appareils
- Profil utilisateur, séances, logs, progression, historique, PDC/PDC+X
- Créateur de séances personnalisées avec bibliothèque d'exercices filtrable

## Stack

- Frontend: HTML/CSS/JS vanilla
- Auth: Firebase Authentication
- Données cloud: Firebase Firestore
- Sync offline: Firestore persistence + sync au reconnect

## Setup local

1. Créer un projet Firebase
2. Activer:
   - Authentication > Google
   - Authentication > Email/Password
   - Firestore Database (mode production recommandé)
3. Copier `firebase-config.example.js` en `firebase-config.js`
4. Remplir les clés Firebase dans `firebase-config.js`
5. Servir le dossier en HTTP local (ex: extension Live Server)
6. Ouvrir `auth.html`

## Déploiement (Firebase Hosting)

1. Installer Firebase CLI:
   - `npm i -g firebase-tools`
2. Login:
   - `firebase login`
3. Init Hosting dans le repo:
   - `firebase init hosting`
   - public dir: `.`
   - single-page app: `No`
4. Déployer:
   - `firebase deploy`

## Sécurité Firestore (exemple de base)

Publier des règles minimales:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Fichiers clés

- `auth.html`: page de connexion
- `cloud.js`: auth + sync cloud
- `training.js`: moteur métier local + cloud hooks
- `profil.html`: profil utilisateur
- `progression.html`: dashboard progression
- `create-session.html`: création de séance personnalisée
- `exercises-library.js`: base d'exercices riche et filtrable

## Remarque

Si `firebase-config.js` est absent, l'app fonctionne en local-only (localStorage), mais sans auth cloud.