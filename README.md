# Météo Montréal

Application React et Vite pour consulter les prévisions quotidiennes de Montréal, saisies par un météorologue.

## Démarrage

```sh
npm install
cp .env.example .env.local
npm run dev
```

Les prévisions et leurs icônes sont saisies manuellement dans l’espace météorologue. Aucune prévision de démonstration ni donnée météo externe n’est affichée.

## Configuration Firebase

1. Créez un projet Firebase et une application Web, puis copiez ses paramètres dans `.env.local`.
2. Activez **Authentication > Sign-in method > Email/Password**. Aucun flux d’inscription n’est exposé par le site; créez les comptes météorologues depuis la console Firebase.
3. Créez la base Firestore et publiez les règles du fichier `firestore.rules`.
4. Pour chaque météorologue autorisé, créez dans Firestore un document `users/{UID}` avec le champ `role: "meteorologist"`. Le document utilisateur doit être créé par un administrateur dans la console Firebase; les règles interdisent sa modification depuis l’application.

Les prévisions sont des documents `forecasts/{AAAA-MM-JJ}`. Elles sont lisibles publiquement et seules les identités dont le rôle est autorisé peuvent les modifier. Les variables de configuration Firebase côté navigateur ne sont pas des secrets; l’autorisation réelle est appliquée par les règles Firestore.