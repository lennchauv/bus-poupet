# Bus Poupet 2026

## Avant de déployer — activer Firestore

1. Va sur https://console.firebase.google.com/project/bus-poupet
2. Clique sur **"Firestore Database"** dans le menu gauche
3. Clique **"Créer une base de données"**
4. Choisis **"Démarrer en mode test"** → Suivant → Terminer

Puis configure les règles Firestore (onglet "Règles") :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inscriptions/{id} {
      allow read, write: if true;
    }
  }
}
```

## Déployer sur Vercel

1. Push ce dossier sur GitHub (nouveau repo)
2. Va sur https://vercel.com → "New Project"
3. Importe ton repo GitHub
4. Vercel détecte React automatiquement → clique **Deploy**
5. Ton site sera dispo sur une URL type `bus-poupet.vercel.app`

## Changer le mot de passe admin

Dans `src/App.js`, ligne :
```js
const ADMIN_PASSWORD = "festival2025";
```
Change `festival2025` par ce que tu veux.
