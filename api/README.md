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

## Authentification

Deux modes, choisis par les variables d'environnement (`src/auth/auth.config.ts`) :

- **OpenID Connect** dès que `OIDC_ISSUER` est défini. Le front obtient un jeton d'accès auprès de
  Keycloak (flux « authorization code » avec PKCE). L'API vérifie sa signature (clés publiques
  JWKS), l'émetteur, l'audience `mutualisation-api` et l'expiration, puis retrouve le profil par
  le `sub` du jeton (colonne `users.auth_subject`). C'est le seul mode accepté en production.
- **Démonstration** sinon : `Authorization: Bearer <identifiant>` avec un compte de démo :
  `u-pro-1` (Atelier Dumont SRL), `u-pro-2`, `u-part-1` (Julie), `u-part-2`, `u-part-3`.

### Keycloak en local

```bash
docker compose up -d keycloak         # http://localhost:8080 (admin / admin)
cp .env.example .env                  # puis décommenter OIDC_ISSUER
npm run start:dev
```

Le realm `mutualisation` (`keycloak/mutualisation-realm.json`) est importé au premier démarrage :
client public `mutualisation-web` (PKCE), création de compte ouverte, interface en français,
et deux comptes de démo liés aux profils existants : `julie` / `julie` (particulier) et
`atelier` / `atelier` (pro).

### Inscription

Une personne qui se connecte pour la première fois n'a pas encore de profil : l'API répond
`403` avec `code: "PROFILE_REQUIRED"` et le front ouvre `/inscription`. `POST /api/me` crée le
profil (particulier ou pro, avec numéro BCE). L'e-mail vient du jeton et n'est pas saisi.

### itsme

itsme s'ajoute dans Keycloak comme **fournisseur d'identité** (Identity providers, OpenID
Connect v1.0) avec l'alias `itsme` ; le bouton « Se connecter avec itsme » du front envoie
`kc_idp_hint=itsme` pour aller directement chez itsme. Il faut pour cela un contrat partenaire
itsme, qui fournit les identifiants et l'adresse de configuration (environnement de test puis
de production). Tant qu'il n'est pas configuré, le bouton mène à l'écran de connexion Keycloak.

Une connexion via itsme marque le profil comme vérifié (`verifiedAt`) : le jeton porte
`identity_provider: "itsme"`, ajouté par le realm. Le nom du fournisseur se règle avec
`OIDC_VERIFIED_IDP`.

## Géolocalisation

À la publication, l'adresse est géocodée (`src/geo/geocoder.ts`) par un service compatible
Nominatim (OpenStreetMap) : l'adresse complète, puis le centre de la commune si la rue n'est pas
trouvée. Les résultats sont mis en cache et les appels espacés d'une seconde (règles du service
public). Si le service ne répond pas, l'annonce est publiée sans position (`location: null`).

La position exacte reste en base. L'API ne publie qu'une **position arrondie à environ 1 km**,
pour situer une annonce sans révéler le domicile de la personne. Le tri « Autour de moi » se fait
dans le navigateur : la position de la personne n'est jamais envoyée au serveur.

Pour la production : `GEOCODER_USER_AGENT` avec un contact, et à fort trafic une instance
Nominatim hébergée ou un fournisseur commercial (même interface `Geocoder`).

## Photos

`POST /api/photos` vérifie que le fichier est bien une image (JPEG, PNG, WebP), la redresse,
la réduit à 1600 px et la convertit en WebP (`sharp`). **Les métadonnées sont supprimées**,
dont la position GPS des photos prises au téléphone. L'adresse renvoyée se met dans `photoUrls`
à la publication ; les liens vers d'autres sites sont refusés.

Stockage (`src/photos/photo-storage.ts`) : disque local (`uploads/`) en développement, stockage
objet compatible S3 en production (Scaleway, OVHcloud… : hébergement européen), servi
directement par le stockage ou un CDN. Variables dans `.env.example`.

## Endpoints

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/resources?type=&audience=&ownerRole=&ownerId=` | public | Liste des annonces publiées |
| GET | `/api/resources/:id` | public | Détail, indisponibilités incluant les réservations actives |
| POST | `/api/resources` | connecté | Publier une annonce |
| GET | `/api/bookings?as=requester\|owner` | connecté | Mes demandes, ou les demandes reçues |
| POST | `/api/bookings` | connecté | Réserver une période ou rejoindre un achat groupé |
| PATCH | `/api/bookings/:id/status` | connecté | Confirmer, refuser, annuler… |
| POST | `/api/photos` | connecté | Envoi d'une photo (multipart, champ `photo`, 10 Mo max) ; renvoie `{ url }` |
| GET | `/api/photos/:fichier` | public | Photo (stockage local uniquement) |
| GET | `/api/me` | connecté | Profil (`403 PROFILE_REQUIRED` s'il reste à créer) |
| POST | `/api/me` | connecté, sans profil | Inscription (OpenID Connect uniquement) |

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
├── auth/        # garde d'authentification (OpenID Connect ou démo)
├── users/       # profil et inscription
├── geo/         # géocodage des adresses
├── photos/      # envoi, réduction et stockage des photos
├── common/      # schémas Zod et pipe de validation
├── resources/   # annonces
├── bookings/    # réservations
└── users/       # /me
drizzle/         # migrations SQL générées
```
