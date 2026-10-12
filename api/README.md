# Mutualisation : API

API REST de la plateforme de mutualisation (NestJS 12, Drizzle ORM, PostgreSQL).
Elle sert le front Angular (`../web`) et applique les règles métier : disponibilités,
calcul des prix, droits de chacun et cycle de vie des réservations.

## Démarrer

```bash
npm install --legacy-peer-deps
npm run start:dev          # http://localhost:3000/api
```

Sans configuration, l'API tourne sur **PGlite** (PostgreSQL embarqué en mémoire) avec les
données de démonstration : rien à installer, mais tout est perdu à l'arrêt.

Pour une vraie base PostgreSQL :

```bash
docker compose up -d
DATABASE_URL=postgres://mutualisation:mutualisation@localhost:5432/mutualisation SEED=1 npm run start:dev
```

Les migrations (`drizzle/`) s'appliquent au démarrage. Après une modification de
`src/db/schema.ts` : `npm run db:generate`.

## Authentification (démonstration)

`Authorization: Bearer <identifiant>` avec un compte de démo : `u-pro-1` (Atelier Dumont SRL),
`u-pro-2`, `u-part-1` (Julie), `u-part-2`, `u-part-3`.
**À remplacer avant la production** par OpenID Connect (itsme, Keycloak, Auth0…) : voir
`src/auth/auth.ts`.

## Endpoints

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/resources?type=&audience=&ownerRole=&ownerId=` | public | Liste des annonces publiées |
| GET | `/api/resources/:id` | public | Détail, indisponibilités incluant les réservations actives |
| POST | `/api/resources` | connecté | Publier une annonce |
| GET | `/api/bookings?as=requester\|owner` | connecté | Mes demandes, ou les demandes reçues |
| POST | `/api/bookings` | connecté | Réserver une période ou rejoindre un achat groupé |
| PATCH | `/api/bookings/:id/status` | connecté | Confirmer, refuser, annuler… |
| GET | `/api/me` | connecté | Profil |

Erreurs : `400` données invalides (avec `issues`), `401` non connecté, `403` action interdite,
`404` introuvable, `409` conflit (dates prises, transition impossible, achat clôturé).
Le champ `message` est en français et peut être affiché tel quel.

## Règles métier

- **Double réservation impossible :** la ressource est verrouillée (`SELECT … FOR UPDATE`)
  pendant la vérification des dates.
- **Prix calculé par le serveur** (`src/domain/pricing.ts`), le front n'affiche qu'une estimation.
- **Droits :** seul le propriétaire confirme, refuse, démarre ou termine. Seul le demandeur annule.
  Les deux peuvent ouvrir un litige. Les transitions suivent `BOOKING_TRANSITIONS`.
- **Public :** on ne peut réserver que les annonces ouvertes à son espace, et jamais la sienne.

## Tests

```bash
npm test                                  # tests unitaires
npx vitest run --config vitest.config.e2e.ts   # tests de bout en bout (PGlite)
```

## Structure

```
src/
├── domain/      # modèles partagés avec le front (copie) + règles de prix
├── db/          # schéma Drizzle, connexion, données de démo
├── auth/        # garde d'authentification (démo)
├── common/      # schémas Zod et pipe de validation
├── resources/   # annonces
├── bookings/    # réservations
└── users/       # /me
drizzle/         # migrations SQL générées
```
