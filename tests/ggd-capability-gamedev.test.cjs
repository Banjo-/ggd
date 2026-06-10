'use strict';

/**
 * ggd-capability-gamedev.test.cjs — tests GGD (fork additif).
 *
 * Trois familles :
 *   1. Enregistrement de la capability `gamedev` dans le registre généré.
 *   2. État squelette : config différée (voir note upstream ci-dessous).
 *   3. Capteur de dérive du Loop Host Contract — notre seule interface avec
 *      upstream : si un des 12 points disparaît ou change de nom à un merge
 *      upstream, ce test casse AVANT que la capability ne se câble dessus.
 *
 * NOTE UPSTREAM (jalon 1) : les clés de config fédérées (gamedev.review_mode,
 * workflow.gdd_phase, workflow.director_gates, gamedev.autonomous_halt_on_reject)
 * sont différées. Cause : tests/federated-config.test.cjs §8 (« real registry:
 * all UI keys are central → no-op channel ») suppose que TOUTE clé fédérée est
 * centrale (pending-migration) — vrai tant que `ui` est la seule capability,
 * faux dès qu'une deuxième capability apporte des clés non-centrales (ce qui est
 * le design cible). PR upstream à proposer : généraliser ce test per-capability.
 * Quand elle atterrit : restaurer les slices dans capability.json et remplacer
 * le test « config différée » ci-dessous par les assertions de défauts.
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

test('gamedev est config-only au squelette (steps/gates/skills/agents vides)', () => {
  const cap = registry.capabilities.gamedev;
  // Invariant du squelette : le câblage steps/gates arrive avec les vraies
  // skills (jalons 1-2). Si ce test casse parce qu'on ajoute un step, c'est
  // normal : le mettre à jour en même temps que le manifeste.
  assert.deepEqual(cap.steps, []);
  assert.deepEqual(cap.gates, []);
  assert.deepEqual(cap.skills, []);
  assert.deepEqual(cap.agents, []);
});

// ─── 2. Config différée (capteur de réactivation) ────────────────────────────

test('config différée : aucune clé gamedev fédérée tant que la PR upstream n\'a pas atterri', () => {
  const cap = registry.capabilities.gamedev;
  assert.deepEqual(
    cap.config, {},
    'des clés de config sont apparues : vérifier que federated-config.test.cjs §8 a été ' +
    'généralisé upstream, puis remplacer ce test par les assertions de défauts (voir NOTE en tête)',
  );
  for (const key of Object.keys(registry.configKeys)) {
    assert.notEqual(registry.configKeys[key], 'gamedev', `clé fédérée inattendue: ${key}`);
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
