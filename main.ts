// Port Solano — entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory, then writes output/dossier.json with buildDossier from the
// vendored kit library. Running it twice yields identical bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name) {
  const src = join(REPO_ROOT, name);
  const dst = join(OUTPUT_DIR, name);
  if (!existsSync(src)) {
    throw new Error('main.ts: missing ' + name + '/ in the repository at ' + src);
  }
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree('game');
  copyTree('screenshots');
  const dossier = buildDossier(OUTPUT_DIR, CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log('Port Solano: wrote ' + join(OUTPUT_DIR, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
