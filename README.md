# Mutualisation

Plateforme belge de mutualisation et d'économie circulaire : partage d'espaces, location de
matériel et achats groupés, entre professionnels (B2B) et entre particuliers (B2C).

| Dossier | Contenu | Stack |
|---|---|---|
| [`web/`](web/) | Application PWA, mobile-first et installable | Angular 22 (Signals, zoneless), Tailwind 4 |
| [`api/`](api/) | API REST et règles métier | NestJS 12, Drizzle ORM, PostgreSQL |

## Démarrage rapide

Prérequis : Node.js 22.22.3 ou plus récent (ou Node 24).

```bash
# Front seul, avec des données fictives
cd web && npm install && npm start            # http://localhost:4200

# Front + API (PostgreSQL en mémoire, données de démo)
cd api && npm install --legacy-peer-deps && npm run start:dev   # terminal 1
cd web && npm run start:api                                       # terminal 2
```

Documentation : [`web/ARCHITECTURE.md`](web/ARCHITECTURE.md) (front, étape par étape) et
[`api/README.md`](api/README.md) (endpoints, règles métier, base de données).

## Tests

```bash
cd web && npx ng test --watch=false
cd api && npm test && npx vitest run --config vitest.config.e2e.ts
```

La CI GitHub Actions lance les deux à chaque pull request.
