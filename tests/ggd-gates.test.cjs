'use strict';

/**
 * ggd-gates.test.cjs — tests GGD du jalon 1 (gates directeurs).
 *
 * Le gros de la cohérence (registre ↔ juges ↔ commande ↔ manifeste) est
 * vérifié par scripts/ggd/lint-gates.cjs ; le premier test l'exécute tel
 * quel pour que `node --test tests/ggd-*` couvre tout sans dupliquer la
 * logique. Les tests suivants verrouillent les invariants de design que le
 * linter ne porte pas.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('lint-gates passe (cohérence registre ↔ juges ↔ commande ↔ manifeste)', () => {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'ggd', 'lint-gates.cjs')], {
    encoding: 'utf8',
  });
  assert.match(out, /^OK lint-gates:/);
});

test('le registre déclare exactement les 4 gates fondateurs', () => {
  const src = fs.readFileSync(path.join(ROOT, 'gsd-core', 'references', 'ggd', 'gates.md'), 'utf8');
  const ids = [...src.matchAll(/^## ([A-Z]{2}-[A-Z][A-Z-]*)$/gm)].map((m) => m[1]);
  assert.deepEqual(ids.sort(), ['AD-COHERENCE', 'CD-PILLARS', 'PR-SCOPE', 'TD-ARCHITECTURE']);
});

test('le registre porte le contrat advisory et la résolution du review mode', () => {
  const src = fs.readFileSync(path.join(ROOT, 'gsd-core', 'references', 'ggd', 'gates.md'), 'utf8');
  assert.ok(src.includes('ADVISORY'), 'le contrat advisory doit être explicite');
  assert.ok(src.includes('gamedev.review_mode'), 'la clé de résolution du mode doit être nommée');
  for (const mode of ['`full`', '`lean`', '`solo`']) {
    assert.ok(src.includes(mode), `mode manquant dans le registre: ${mode}`);
  }
});

test('la commande gate-check existe, référence le registre et respecte le protocole autonome', () => {
  const cmdPath = path.join(ROOT, 'commands', 'gsd', 'gamedev-gate-check.md');
  const src = fs.readFileSync(cmdPath, 'utf8');
  assert.match(src, /^name: gsd:gamedev-gate-check$/m);
  assert.ok(src.includes('references/ggd/gates.md'), 'doit @-référencer le registre');
  assert.ok(src.includes('GATE-REPORT.md'), 'doit produire GATE-REPORT.md');
  assert.ok(src.includes('autonomous_halt_on_reject'), 'doit câbler le protocole autonome');
  assert.ok(/ADVISORY/.test(src), 'le contrat advisory doit être explicite dans la commande');
  assert.ok(
    src.includes('never block the loop'),
    'la commande doit affirmer que les verdicts ne bloquent jamais la boucle',
  );
});

test('les 4 juges sont en lecture seule (ni Write, ni Edit, ni Bash)', () => {
  for (const judge of [
    'ggd-creative-director', 'ggd-technical-director', 'ggd-producer', 'ggd-art-director',
  ]) {
    const src = fs.readFileSync(path.join(ROOT, 'agents', `${judge}.md`), 'utf8');
    const tools = src.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
    for (const forbidden of ['Write', 'Edit', 'Bash']) {
      assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(tools), `${judge}: ${forbidden} interdit`);
    }
    assert.ok(src.includes('<must_not_do>'), `${judge}: section must_not_do requise`);
  }
});
