// Construit la démo en ligne en un seul fichier HTML autonome (CSS et JS intégrés, texte ASCII),
// publiable tel quel sur un hébergement qui n'accepte qu'une page : `npm run build:demo-page`.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist/mutualisation/browser';
execSync('npx ng build --configuration demo', { stdio: 'inherit' });

const files = readdirSync(dist);
const main = files.find((f) => /^main-.*\.js$/.test(f));
const css = readFileSync(
  join(
    dist,
    files.find((f) => /^styles-.*\.css$/.test(f)),
  ),
  'utf8',
);
// Un seul script : les modules chargés à la demande sont intégrés au paquet.
const { outputFiles } = await build({
  entryPoints: [join(dist, main)],
  bundle: true,
  format: 'iife',
  minify: true,
  charset: 'ascii',
  write: false,
});
const js = outputFiles[0].text.replaceAll('</script', '<\\/script');

writeFileSync(
  'dist/mutualisation-demo.html',
  `<title>Mutualisation (d&eacute;mo)</title>
<style>
html,body{background:#f8fafc;color:#0f172a}
${css}
</style>
<app-root></app-root>
<script>${js}</script>
`,
);
console.log('dist/mutualisation-demo.html');
