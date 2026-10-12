# Mutualisation : architecture front-end (Angular 22 PWA)

Toutes les commandes ci-dessous ont été exécutées et le projet obtenu compile (`ng build` OK, Angular 22.2, Tailwind 4, TypeScript 6). Le code complet est dans ce dossier (`web/` du dépôt).

## Étape 1 : commandes d'initialisation

Prérequis : Node.js ≥ 22.22.3 (ou 24.15+). Angular CLI 22 refuse les versions inférieures.

```bash
# 1. Créer le projet : standalone, strict, routage, Tailwind, sans zone.js, sans SSR
npx @angular/cli@22 new mutualisation \
  --routing \
  --style=tailwind \
  --strict \
  --zoneless \
  --ssr=false \
  --test-runner=vitest \
  --package-manager=npm

cd mutualisation

# 2. Ajouter la PWA : service worker, manifest, icônes, provideServiceWorker()
npx ng add @angular/pwa --skip-confirmation

# 3. Vérifier
npx ng build          # le service worker n'est actif qu'en build de production
npx http-server dist/mutualisation/browser -p 8080   # tester l'offline et l'installation
```

Notes :

- `--style=tailwind` (nouveau depuis Angular 21) installe `tailwindcss` et `@tailwindcss/postcss`, crée `.postcssrc.json` et ajoute `@import 'tailwindcss';` dans `src/styles.css`. Aucune configuration manuelle n'est nécessaire avec Tailwind 4.
- Les composants sont standalone par défaut, et `--zoneless` fait reposer toute la détection de changements sur les Signals.
- `ng add @angular/pwa` crée `ngsw-config.json`, `public/manifest.webmanifest` et les icônes, et enregistre le service worker dans `app.config.ts` (`registerWhenStable:30000`).

## Étape 2 : arborescence « feature-driven »

```
src/app/
├── app.config.ts            # providers globaux (router, service worker)
├── app.routes.ts            # routes racines + lazy loading /pro et /particulier
├── core/                    # singletons, chargés une seule fois
│   ├── auth/
│   │   ├── auth.store.ts    # état utilisateur en Signals (user, role, isAuthenticated)
│   │   └── role.guard.ts    # canMatch par rôle : bloque aussi le téléchargement du bundle
│   ├── pwa/
│   │   ├── sw-update.service.ts       # nouvelle version disponible
│   │   ├── install-prompt.service.ts  # prompt d'installation (beforeinstallprompt)
│   │   └── network-status.service.ts  # online / offline en Signal
│   └── layout/              # shell, header, navigation basse mobile (à venir)
├── shared/                  # réutilisable par les deux espaces, sans logique métier propre
│   ├── models/              # interfaces TypeScript (étape 3)
│   ├── ui/                  # composants UI communs (à venir après validation)
│   │   ├── button/
│   │   ├── calendar/
│   │   └── resource-card/
│   └── utils/
└── features/                # une fonctionnalité = un dossier, chargé en lazy loading
    ├── home/                # choix de l'espace
    ├── auth/                # connexion, inscription
    ├── pro/                 # B2B → /pro
    │   ├── pro.routes.ts
    │   └── pages/           # dashboard, espaces, materiel, achats-groupes
    ├── particulier/         # B2C → /particulier
    │   ├── particulier.routes.ts
    │   └── pages/           # dashboard, outils, co-stockage, achats-quartier, location-weekend
    ├── resources/           # détail d'une ressource, commun aux deux espaces
    └── bookings/            # « mes réservations », commun aux deux espaces
```

Règles de dépendance :

- `features/*` peut importer `core/` et `shared/`, jamais une autre feature. `pro` et `particulier` ne se connaissent pas.
- L'interaction B2B ↔ B2C passe par les features transverses (`resources`, `bookings`) et par le champ `audience` des ressources.
- `shared/` n'importe jamais `features/` ni `core/`.

Routes :

| URL | Chargement | Accès |
|---|---|---|
| `/` | `features/home` | public |
| `/connexion` | `features/auth` | public |
| `/pro/**` | `loadChildren` → `PRO_ROUTES` | rôle `pro` |
| `/particulier/**` | `loadChildren` → `PARTICULIER_ROUTES` | rôle `particulier` |
| `/ressources/:resourceId` | `features/resources` | public (consultation) |
| `/reservations` | `features/bookings` | connecté |

Le build confirme que chaque espace et chaque page est un chunk séparé (`pro-routes`, `particulier-routes`, etc.).

## Étape 3 : modèles de données

Fichiers dans `src/app/shared/models/`, importables via `shared/models` (barrel `index.ts`).

- `common.model.ts` : identifiants « marqués » (`UserId`, `ResourceId`, `BookingId`) pour ne pas pouvoir passer un `UserId` là où on attend un `ResourceId`, dates `IsoDateTime`, `Money` en centimes EUR, `Address` belge (région Bruxelles / Wallonie / Flandre), `DateRange`.
- `user.model.ts` : `User = ProUser | ParticulierUser`, union discriminée sur `role`. Le pro porte une `Company` (TVA `BE…`, taille `tpe | pme | commercant`), le particulier un nom et un quartier pour les achats groupés de quartier. Gardes `isProUser` / `isParticulierUser`.
- `resource.model.ts` : `Resource = MaterielResource | EspaceResource | AchatGroupeResource`, discriminée sur `type`. Champ `audience` (au moins un rôle) qui décide quel écosystème peut réserver, `weekendOnly` pour le matériel pro le week-end, `Pricing` gratuit ou payant, helper générique `isResourceOfType(r, 'espace')`.
- `booking.model.ts` : `Booking = RentalBooking | GroupPurchaseBooking`, discriminée sur `resourceType` (une période pour matériel et espace, une quantité pour un achat groupé). Statuts `en_attente → confirmee → en_cours → terminee`, plus `refusee`, `annulee` et `litige`. La table `BOOKING_TRANSITIONS` et `canTransition()` encodent les transitions autorisées, et `history` est un journal immuable non vide de chaque changement de statut.

## Étape 4 : composants UI communs

Dans `src/app/shared/ui/` (importables via `shared/ui`), tous standalone, `OnPush`, basés sur `input()` / `model()` / `computed()`, avec la syntaxe `@if` / `@for` / `@switch`. Aperçu mobile : `docs/apercu-composants-ui.png`.

- `Button` (`button[appButton]`, `a[appButton]`) : appliqué en attribut pour garder la sémantique native (action ou lien). Variantes `primary | secondary | ghost | danger`, tailles `sm | md | lg` (cible tactile de 44 px dès `md`), `loading` (spinner et `aria-busy`), `disabled` (`aria-disabled` sur un lien).
- `ResourceCard` (`<app-resource-card [resource]="r" />`) : carte cliquable vers `/ressources/:id`. Le contenu s'adapte au type : prix et mention « week-end » pour le matériel, surface pour un espace, prix unitaire et barre de progression vers le seuil pour un achat groupé.
- `Calendar` (`<app-calendar [unavailable]="r.unavailable" [weekendOnly]="r.weekendOnly" [(selection)]="plage" />`) : sélection d'une plage de jours, semaine commençant le lundi, libellés `fr-BE`. Bloque les jours passés, les périodes indisponibles et, si `weekendOnly`, les jours de semaine. Une plage ne peut pas enjamber un jour bloqué. La logique pure est isolée dans `calendar.utils.ts`.
- `shared/utils/format.ts` : `formatMoney` (centimes vers `12,50 €`) et `formatPricing` (`25,00 € / week-end`, `Gratuit`).

Nouveau type dans `common.model.ts` : `IsoDate` (`YYYY-MM-DD`, jour calendaire sans heure) et `DayRange`, ce que renvoie le calendrier.

Tests : `npx ng test` lance 15 tests Vitest (6 fichiers), tous verts.

## Étape 5 : pages de l'espace B2B (`/pro`)

Captures mobiles : `docs/pro-1-dashboard.png` à `docs/pro-4-achats.png`.

Pour essayer : `npx ng serve`, ouvrir `/connexion` et cliquer sur « Entrer comme professionnel » (compte de démonstration).

- **Données :** les pages dépendent de `ResourceApi` et `BookingApi` (`core/api/`), deux classes abstraites. Pour l'instant `app.config.ts` fournit des implémentations en mémoire (`core/api/mock/`, avec des annonces belges et une latence simulée). Brancher l'API réelle ne demandera que deux nouvelles classes HTTP et deux lignes dans `app.config.ts`, sans toucher aux pages.
- **Chargement :** chaque page utilise `resource()` d'Angular 22, qui expose en Signals la valeur, l'état de chargement et l'erreur. La grille affiche un squelette pendant le chargement et un message en cas d'erreur.
- **`ProLayout` :** l'en-tête affiche le nom de l'entreprise et un bandeau hors-ligne. La navigation est une barre basse sur mobile et passe en haut à partir de 768 px.
- **Tableau de bord (`/pro`) :** trois indicateurs (annonces publiées, demandes en attente, réservations à venir) et la liste des demandes reçues, avec un badge Pro ou Particulier. Les boutons Accepter et Refuser passent par `canTransition` et ajoutent une entrée à l'historique.
- **Espaces (`/pro/espaces`) :** recherche par nom, commune ou code postal, insensible aux accents, et filtre par type d'espace.
- **Matériel (`/pro/materiel`) :** recherche et filtre par catégorie, les catégories étant déduites des annonces.
- **Achats groupés (`/pro/achats-groupes`) :** seuls les achats encore ouverts sont affichés, triés par échéance. On peut filtrer selon que l'objectif est atteint ou non, et la carte indique « Clôture dans X jours ».
- **Nouveaux composants partagés :** `FilterChips` (filtres à choix unique, défilables sur mobile) et `ResourceGrid` (grille avec états chargement, erreur et vide), réutilisables pour l'espace particulier.

Tests : 19 tests Vitest verts (9 fichiers), dont l'acceptation d'une demande sur le tableau de bord et les filtres des espaces.

## Étape 6 : pages de l'espace B2C (`/particulier`)

Captures mobiles : `docs/part-1-dashboard.png` à `docs/part-5-weekend.png`. Pour essayer : `/connexion` puis « Entrer comme particulier ».

- **Coquille commune :** `core/layout/space-shell.ts` regroupe l'en-tête, le bandeau hors-ligne et la navigation des deux espaces. `ProLayout` et `ParticulierLayout` ne font que lui passer leurs liens. `SearchField` a rejoint `shared/ui`.
- **Tableau de bord (`/particulier`) :** les réservations actives de l'utilisateur, avec leur statut (en attente, confirmée…), puis des raccourcis vers les quatre services.
- **Prêt d'outils (`/particulier/outils`) :** uniquement les annonces de particuliers, avec un filtre prêt gratuit ou petite location.
- **Co-stockage (`/particulier/co-stockage`) :** caves, garages et box, y compris les box proposés par des pros ouverts aux particuliers, avec un filtre par surface.
- **Achats de quartier (`/particulier/achats-quartier`) :** par défaut limités au code postal de l'utilisateur, avec un filtre « Toute la Belgique ». Triés par échéance.
- **Matériel pro le week-end (`/particulier/location-weekend`) :** le matériel des pros ouvert aux particuliers. Par défaut, on n'affiche que ce qui est libre le prochain week-end (`shared/utils/weekend.ts`). C'est l'interaction directe B2B → B2C.
- **API :** `ResourceQuery` accepte `ownerRole`, et `BookingApi.listForRequester` a été ajouté. Les données fictives comptent maintenant des annonces de voisins à Bruxelles et Saint-Gilles.

Tests : 26 tests Vitest verts (11 fichiers).

## Étape 7 : formulaire de publication d'annonce

Captures : `docs/pub-1-vide.png` (formulaire), `docs/pub-2-erreurs.png` (envoi refusé), `docs/pub-3-achat.png` (achat groupé), `docs/pub-4-publiee.png` (annonce visible juste après).

- **Accès :** un bouton « + Publier » dans l'en-tête des deux espaces mène à `/pro/publier` ou `/particulier/publier`. On peut présélectionner le type avec `?type=espace`. Il n'y a qu'une seule page (`features/listings/publish.page.ts`), partagée par les deux espaces.
- **Signal Forms** (`@angular/forms/signals`, stable dans Angular 22) : le modèle est un simple `signal<ListingDraft>`, `form()` le transforme en arbre de champs, et `[formField]` lie chaque contrôle natif. Pas de `FormGroup` ni de `FormControl`.
- **Validation** (`features/listings/listing-draft.ts`) : un `schema` déclaratif dont les règles par type passent par `applyWhen`, si bien que les champs d'un achat groupé ne sont validés que pour un achat groupé. On y trouve le prix obligatoire sauf en prêt gratuit, le code postal belge, au moins un public, la clôture dans le futur et le maximum supérieur au seuil. Les messages sont en français et s'affichent sous chaque champ (`shared/ui/field-errors`) une fois le champ touché.
- **Pré-remplissage :** l'adresse de l'utilisateur. Pour un particulier : prêt gratuit, cave ou garage, public particuliers. Pour un pro : tarif par jour, public pros. La région est déduite du code postal (`shared/utils/belgium.ts`).
- **Conversion :** `toNewResource()` transforme le brouillon en `NewResource` typé (montants en centimes, union discriminée correcte). `ResourceApi.create()` complète l'identifiant, le propriétaire et le statut. Après la publication, l'utilisateur arrive sur la liste correspondante, où sa nouvelle annonce apparaît en tête.

Tests : 33 tests Vitest verts (14 fichiers), dont les règles de validation par type et un envoi complet du formulaire.

Non inclus pour l'instant : l'ajout de photos (il faudra un stockage de fichiers côté API) et la modification d'une annonce existante.

## Étape 8 : détail d'une ressource et réservation

Captures : `docs/detail-2-selection.png`, `docs/detail-3-envoyee.png`, `docs/detail-4-achat.png`.

- **Page commune (`/ressources/:resourceId`)**, ouverte depuis n'importe quelle carte. Elle affiche les caractéristiques selon le type (état, catégorie, surface, accès, clôture) et le tarif avec la caution.
- **Location :** on choisit ses jours dans le calendrier, qui bloque les jours passés, les périodes prises et, si besoin, les jours de semaine. Le prix est estimé (`shared/utils/pricing.ts`). Règles à valider : un week-end couvre jusqu'à 3 jours, un mois 30 jours, toute unité entamée est due, et le tarif horaire est « à convenir ».
- **Achat groupé :** on choisit la quantité (dans la limite du maximum), le total se met à jour, et la participation incrémente le compteur.
- **Cas bloquants expliqués :** utilisateur non connecté (avec un lien vers la connexion), annonce réservée à l'autre espace, sa propre annonce, achat complet ou clôturé.
- `BookingApi.create(NewBooking)` envoie une période horodatée : les jours locaux de l'utilisateur sont convertis en `DateRange` (`dayRangeToDateRange`), ce qui évite les erreurs de fuseau horaire côté serveur.

## Étape 9 : branchement sur l'API

L'API est dans le dossier voisin `api/` (NestJS, Drizzle, PostgreSQL) : voir `api/README.md`.

- `core/api/provide-api.ts` choisit l'implémentation selon l'environnement : `mock` avec `npm start` (rien à lancer à côté), `http` avec `npm run start:api` et en production.
- **Implémentations HTTP** (`core/api/http/`) : mêmes contrats `ResourceApi` et `BookingApi`, les pages n'ont pas changé. Les erreurs de l'API deviennent des `ApiError` dont le message en français s'affiche tel quel.
- **Authentification :** `core/auth/auth.interceptor.ts` envoie le jeton aux appels de l'API (voir l'étape 10).
- **Proxy :** `proxy.conf.json` redirige `/api` vers `http://localhost:3000`, donc pas de CORS en développement.
- **Hors-ligne :** `ngsw-config.json` met en cache les réponses `GET /api/resources` et `/api/bookings` (stratégie « fraîcheur » : réseau d'abord, cache si le réseau est absent ou répond en plus de 5 s).

Pour essayer avec l'API :

```bash
cd api && npm install --legacy-peer-deps && npm run start:dev   # terminal 1
cd web && npm run start:api                                          # terminal 2
```

Tests : 53 tests Vitest côté front (20 fichiers), 21 côté API (dont 17 de bout en bout sur PGlite).

## Étape 10 : connexion réelle (OpenID Connect, itsme)

La connexion passe par **Keycloak**, qui gère les comptes e-mail et délègue à **itsme** (voir
`api/README.md`, section Authentification). Le front utilise `oidc-client-ts` (flux
« authorization code » avec PKCE, sans secret côté navigateur).

- `core/auth/auth.config.ts` : mode `demo` (avec `npm start`, comptes de démonstration) ou `oidc` (avec `npm run start:api` et en production), défini dans `environments/`.
- `core/auth/auth.service.ts` : `login({ via: 'itsme' | 'keycloak' | 'inscription' })` redirige vers Keycloak ; `itsme` ajoute `kc_idp_hint=itsme` pour aller directement chez itsme, `inscription` ouvre la création de compte (`prompt=create`). Au retour, `completeLogin()` charge le profil via `GET /api/me`. La session est gardée dans l'onglet (`sessionStorage`), renouvelée en silence, et reprise au rechargement par `provideAppInitializer`.
- **Pages :** `/connexion` (itsme, e-mail, créer un compte ; `?retour=` pour revenir à une annonce), `/auth/callback` (retour de Keycloak), `/inscription` (profil particulier ou pro, prérempli avec le nom transmis par itsme).
- **Gardes :** `roleGuard` envoie vers `/inscription` une personne connectée sans profil ; `registrationGuard` protège l'inscription.
- **Déconnexion :** bouton dans l'en-tête des espaces ; ferme aussi la session Keycloak.
- L'intercepteur n'ajoute le jeton qu'aux appels vers `/api`.

Pour essayer :

```bash
cd api && docker compose up -d keycloak && cp .env.example .env   # décommenter OIDC_ISSUER
npm run start:dev                                                    # terminal 1
cd web && npm run start:api                                          # terminal 2
```

Comptes : `julie` / `julie` (particulier) et `atelier` / `atelier` (pro), ou « Créer un compte ».
Captures : `docs/connexion.png`, `docs/connexion-keycloak.png`, `docs/inscription.png`.

## Étape 11 : géolocalisation et photos

- **« Autour de moi »** (`shared/ui/resource-grid`, `core/geo/nearby.service.ts`) : sur toutes les listes, un bouton demande la position au navigateur, trie les annonces par distance et filtre par rayon (5, 10, 25 km ou toute distance). La distance s'affiche sur chaque carte (`shared/utils/geo.ts`, « à moins de 2 km » en dessous de 2 km, car les positions publiées sont arrondies à environ 1 km). La position reste dans le navigateur.
- **Photos** (`shared/ui/photo-picker`) : dans le formulaire de publication, choix dans la galerie ou prise de vue, aperçu, envoi immédiat dans l'ordre choisi, suppression et choix de la couverture (10 maximum). Les photos lourdes sont réduites dans le navigateur avant l'envoi (`shared/utils/image.ts`) pour économiser les données mobiles. Le bouton « Publier » attend la fin des envois.
- **Page de détail** : galerie à faire défiler au doigt.
- **Hors-ligne** : les photos déjà vues restent en cache 30 jours (`ngsw-config.json`).
- `PhotoApi` suit le même principe que les autres API : `MockPhotoApi` (photo gardée dans le navigateur) avec `npm start`, `HttpPhotoApi` avec l'API.

Captures : `docs/photos-formulaire.png`, `docs/autour-de-moi.png`, `docs/galerie.png`.

## Points à valider avant l'étape suivante

1. Les noms d'URL et de pages en français (`/pro/espaces`, `/particulier/co-stockage`…).
2. Le choix « zoneless » (recommandé avec les Signals).
3. Le modèle de réservation en deux variantes (période ou quantité pour les achats groupés).
4. La stratégie hors-ligne : pour l'instant seuls l'app et les assets sont mis en cache. La mise en cache des données API (`dataGroups` dans `ngsw-config.json`) se fera quand l'API sera définie.
