import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Aucun appel réseau pendant les tests : pas de géocodage, photos dans un dossier temporaire.
    env: { GEOCODER: 'none', PHOTO_DIR: 'node_modules/.cache/test-uploads' },
  },
});
