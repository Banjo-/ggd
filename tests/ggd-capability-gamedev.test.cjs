'use strict';

/**
 * ggd-capability-gamedev.test.cjs — tests GGD (fork additif).
 *
 * Trois familles :
 *   1. Enregistrement de la capability `gamedev` dans le registre généré.
 *   2. Config fédérée : défauts et propriété des clés.
 *   3. Capteur de dérive du Loop Host Contract — notre seule interface avec
 *      upstream : si un des 12 points disparaît ou change de nom à un merge
 *      upstream, ce test casse AVANT que la capability ne se câble dessus.
 *
 * NOTE DIVERGENCE (décision utilisateur, 10 juin 2026) : la fédération des clés
 * de config exigeait la généralisation de tests/federated-config.test.cjs §8
 * (sur-contraint : il supposait que toute clé fédérée est centrale, vrai
 * uniquement tant que `ui` est la seule capability). L'utilisateur ayant décliné
 * la PR upstream, la correction est appliquée LOCALEMENT comme divergence
 * assumée et allowlistée (famille 4 du garde-fou). En cas de conflit de merge
 * sur ce fichier upstream : conserver notre version généralisée (strictement
 * plus forte) et re-vérifier qu'elle couvre les assertions upstream du moment.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const registry = require('../gsd-core/bin/lib/capability-registry.cjs');
const { LOOP_HOST_CONTRACT } = require('../gsd-core/bin/lib/loop-host-contract.cjs');

// ─── 1. Enregistrement ────────────────────────────────────────────────────────

test('gamedev est enregistrée comme capability feature', () => {
  const cap = registry.capabilities.gamedev;
  assert.ok(cap, 'capability gamedev absente du registre — relancer gen-capability-registry --write');
  assert.equal(cap.role, 'feature');
  assert.equal(cap.tier, 'full');
  assert.deepEqual(cap.requires, []);
});

test('gamedev au jalon 2 : 3 skills, 5 agents, steps/gates/commandes câblés', () => {
  const cap = registry.capabilities.gamedev;
  assert.deepEqual([...cap.skills].sort(), [
    'gamedev-gate-check', 'gamedev-gdd-phase', 'gamedev-knowledge-context',
  ]);
  assert.deepEqual([...cap.agents].sort(), [
    'ggd-art-director',
    'ggd-creative-director',
    'ggd-game-designer',
    'ggd-producer',
    'ggd-technical-director',
  ]);

  // Steps déclarés : gdd-phase à discuss:post, gate-check à plan:post.
  assert.deepEqual(
    cap.steps.map((s) => [s.point, s.ref.skill, s.when]),
    [
      ['discuss:post', 'gamedev-gdd-phase', 'workflow.gdd_phase'],
      ['plan:post', 'gamedev-gate-check', 'workflow.director_gates'],
    ],
  );

  // Gate mécanique BLOQUANT à execute:pre (couverture GDD→plan) — par
  // contraste avec les verdicts directeurs, advisory.
  assert.equal(cap.gates.length, 1);
  assert.equal(cap.gates[0].point, 'execute:pre');
  assert.equal(cap.gates[0].blocking, true);
  assert.equal(cap.gates[0].check.query, 'ggd-gdd.coverage');
});

// ─── 2. Config fédérée ───────────────────────────────────────────────────────

test('review_mode : enum full|lean|solo, défaut lean', () => {
  const slice = registry.capabilities.gamedev.config['gamedev.review_mode'];
  assert.ok(slice, 'clé gamedev.review_mode absente');
  assert.equal(slice.type, 'enum');
  assert.deepEqual([...slice.values].sort(), ['full', 'lean', 'solo']);
  assert.equal(slice.default, 'lean');
});

test('toggles de workflow : gdd_phase et director_gates actifs par défaut', () => {
  const cfg = registry.capabilities.gamedev.config;
  assert.equal(cfg['workflow.gdd_phase'].type, 'boolean');
  assert.equal(cfg['workflow.gdd_phase'].default, true);
  assert.equal(cfg['workflow.director_gates'].type, 'boolean');
  assert.equal(cfg['workflow.director_gates'].default, true);
});

test('halt_on_reject : opt-in (défaut false — mode autonome à la GSD)', () => {
  const slice = registry.capabilities.gamedev.config['gamedev.autonomous_halt_on_reject'];
  assert.equal(slice.type, 'boolean');
  assert.equal(slice.default, false);
});

test('les clés gamedev sont fédérées et possédées par gamedev', () => {
  for (const key of [
    'gamedev.review_mode',
    'workflow.gdd_phase',
    'workflow.director_gates',
    'gamedev.autonomous_halt_on_reject',
  ]) {
    assert.equal(registry.configKeys[key], 'gamedev', `clé absente ou mal possédée: ${key}`);
  }
});

// ─── 3. Capteur de dérive du Loop Host Contract ──────────────────────────────

const EXPECTED_POINTS = [
  'discuss:pre', 'discuss:post',
  'plan:pre', 'plan:post',
  'execute:pre', 'execute:wave:pre', 'execute:wave:post', 'execute:post',
  'verify:pre', 'verify:post',
  'ship:pre', 'ship:post',
];

test('le Loop Host Contract expose les 12 points attendus par GGD', () => {
  const actual = LOOP_HOST_CONTRACT.flatMap((e) => e.points);
  for (const p of EXPECTED_POINTS) {
    assert.ok(actual.includes(p), `point de boucle manquant après merge upstream: ${p}`);
  }
});

test('les artefacts cœur consommés par les futurs steps GGD existent toujours', () => {
  // gdd-phase consommera CONTEXT.md (discuss) ; gate-check consommera PLAN.md (plan).
  const produced = LOOP_HOST_CONTRACT.flatMap((e) => e.coreArtifacts.produces);
  for (const artifact of ['CONTEXT.md', 'PLAN.md']) {
    assert.ok(produced.includes(artifact), `artefact hôte disparu d'upstream: ${artifact}`);
  }
});
