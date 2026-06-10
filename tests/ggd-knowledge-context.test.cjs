'use strict';

/**
 * ggd-knowledge-context.test.cjs — tests GGD du jalon 3a (couche savoir).
 *
 * Verrouille les invariants Engine Version Safety : la version du moteur est
 * épinglée par scan ou par l'utilisateur, jamais par la mémoire du modèle —
 * c'est la protection anti-cutoff au cœur de la couche savoir.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CMD = path.join(ROOT, 'commands', 'gsd', 'gamedev-knowledge-context.md');
const TPL = path.join(ROOT, 'gsd-core', 'templates', 'ggd', 'project-context.md');

test('la commande knowledge-context existe et référence le template', () => {
  const src = fs.readFileSync(CMD, 'utf8');
  assert.match(src, /^name: gsd:gamedev-knowledge-context$/m);
  assert.ok(src.includes('templates/ggd/project-context.md'), 'doit @-référencer le template');
  assert.ok(src.includes('.planning/knowledge/project-context.md'), 'doit produire le hub au chemin canonique');
});

test('le contrat anti-cutoff est explicite des deux côtés', () => {
  const cmd = fs.readFileSync(CMD, 'utf8');
  const tpl = fs.readFileSync(TPL, 'utf8');
  // La règle « jamais de version depuis la mémoire du modèle » doit être
  // gravée dans la commande ET dans le template produit.
  assert.ok(/NEVER from model memory/i.test(cmd), 'commande : version jamais issue de la mémoire');
  assert.ok(tpl.includes('never what a model'), 'template : version jamais issue de la mémoire');
  assert.ok(tpl.includes('## Engine Version Safety'), 'template : section version safety requise');
  assert.ok(cmd.includes('STOP and ask'), 'commande : version indétectable → stop, pas de devinette');
});

test('le hub est câblé sur le gate TD-ARCHITECTURE (boucle savoir → jugement)', () => {
  const gates = fs.readFileSync(
    path.join(ROOT, 'gsd-core', 'references', 'ggd', 'gates.md'), 'utf8',
  );
  assert.ok(
    gates.includes('.planning/knowledge/project-context.md'),
    'TD-ARCHITECTURE doit consommer le hub produit par knowledge-context',
  );
});

test('la capability gamedev déclare knowledge-context parmi ses skills', () => {
  const registry = require('../gsd-core/bin/lib/capability-registry.cjs');
  assert.ok(
    registry.capabilities.gamedev.skills.includes('gamedev-knowledge-context'),
    'gamedev-knowledge-context absent du manifeste',
  );
});
