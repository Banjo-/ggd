'use strict';

/**
 * ggd-gdd.test.cjs — tests GGD du jalon 2 (GDD comme contrat de design).
 *
 * Couvre : le module de couverture (unitaire), le dispatch CLI via le
 * commandFamilies index (intégration — première famille de commandes
 * contribuée par capability, ADR-959), le template, et la skill.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { runCoverage, RID_RE } = require('../gsd-core/bin/lib/ggd-gdd.cjs');

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ggd-gdd-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

// ─── 1. Couverture (unitaire) ────────────────────────────────────────────────

test('couverture complète → ok', () => {
  const dir = makeFixture({
    'GDD-COMBAT.md': '- **GDD-COMBAT-R01** — règle\n- **GDD-COMBAT-R10** — formule\n',
    '01-PLAN.md': 'Task: GDD-COMBAT-R01, GDD-COMBAT-R10 couverts.\n',
  });
  const r = runCoverage({ phaseDir: dir, plansDir: null });
  assert.equal(r.ok, true);
  assert.equal(r.total, 2);
  assert.deepEqual(r.missing, []);
});

test('R-ID non référencé par un plan → missing, ok=false', () => {
  const dir = makeFixture({
    'GDD-COMBAT.md': '- **GDD-COMBAT-R01** — a\n- **GDD-COMBAT-R02** — b\n',
    '01-PLAN.md': 'Task: GDD-COMBAT-R01 seulement.\n',
  });
  const r = runCoverage({ phaseDir: dir, plansDir: null });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['GDD-COMBAT-R02']);
});

test('phase sans GDD → ok par vacuité (gate non applicable)', () => {
  const dir = makeFixture({ '01-PLAN.md': 'Task: stuff.\n' });
  const r = runCoverage({ phaseDir: dir, plansDir: null });
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
});

test('le regex R-ID accepte les slugs composés et rejette les formes invalides', () => {
  const ok = 'GDD-SAVE-SYSTEM-R12';
  const bad = ['GDD-combat-R01', 'GDD-COMBAT-12', 'GG-COMBAT-R01'];
  assert.ok(ok.match(RID_RE));
  for (const b of bad) {
    assert.equal((b.match(RID_RE) ?? []).length, 0, `ne devrait pas matcher: ${b}`);
  }
});

// ─── 2. Dispatch CLI (intégration ADR-959) ───────────────────────────────────

test('gsd-tools ggd-gdd coverage dispatche via le commandFamilies index', () => {
  const dir = makeFixture({
    'GDD-X.md': '- **GDD-X-R01** — a\n',
    'PLAN.md': 'rien d\'autre\n',
  });
  let status = 0;
  let stdout = '';
  try {
    stdout = execFileSync(
      'node',
      [path.join(ROOT, 'gsd-core', 'bin', 'gsd-tools.cjs'), 'ggd-gdd', 'coverage', '--phase', dir],
      { encoding: 'utf8' },
    );
  } catch (e) {
    status = e.status;
    stdout = e.stdout;
  }
  assert.equal(status, 1, 'couverture incomplète → exit 1 (gate bloquant)');
  const parsed = JSON.parse(stdout);
  assert.deepEqual(parsed.missing, ['GDD-X-R01']);
});

test('la famille ggd-gdd est enregistrée et possédée par gamedev', () => {
  const registry = require('../gsd-core/bin/lib/capability-registry.cjs');
  const entry = registry.commandFamilies['ggd-gdd'];
  assert.ok(entry, 'famille ggd-gdd absente du registre');
  assert.equal(entry.capId, 'gamedev');
  assert.equal(entry.module, 'ggd-gdd.cjs');
  assert.equal(entry.router, 'routeGgdGddCommand');
});

// ─── 3. Template et skill ────────────────────────────────────────────────────

test('le template GDD porte les 8 sections et le contrat R-ID', () => {
  const tpl = fs.readFileSync(path.join(ROOT, 'gsd-core', 'templates', 'ggd', 'gdd.md'), 'utf8');
  for (const section of [
    '## 1. Overview', '## 2. Player Fantasy', '## 3. Detailed Rules', '## 4. Formulas',
    '## 5. Edge Cases', '## 6. Dependencies', '## 7. Tuning Knobs', '## 8. Acceptance Criteria',
  ]) {
    assert.ok(tpl.includes(section), `section manquante: ${section}`);
  }
  assert.ok(tpl.includes('append-only'), 'la règle R-ID append-only doit être gravée');
});

test('la skill gdd-phase écrit squelette d\'abord et câble la couverture', () => {
  const src = fs.readFileSync(path.join(ROOT, 'commands', 'gsd', 'gamedev-gdd-phase.md'), 'utf8');
  assert.match(src, /^name: gsd:gamedev-gdd-phase$/m);
  assert.ok(src.includes('skeleton FIRST'), 'écriture incrémentale squelette d\'abord (protection contexte)');
  assert.ok(src.includes('ggd-gdd coverage'), 'doit câbler le gate de couverture');
  assert.ok(src.includes('ggd-game-designer'), 'doit consulter le game designer');
});
