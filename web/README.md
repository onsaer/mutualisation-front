# Mutualisation : application web

PWA Angular 22. Voir [`ARCHITECTURE.md`](ARCHITECTURE.md) pour l'architecture et les choix.

| Commande | Effet |
|---|---|
| `npm start` | Serveur de développement avec données fictives (aucune API nécessaire) |
| `npm run start:api` | Serveur de développement branché sur l'API (`../api`, port 3000) |
| `npm run build` | Build de production (service worker actif) |
| `npx ng test --watch=false` | Tests Vitest |
