'use strict';

/**
 * ggd-gdd.cjs — famille de commandes CLI `ggd-gdd` de la capability gamedev.
 * Première famille de commandes contribuée par capability (ADR-959,
 * commandFamilies index) : déclarée dans capabilities/gamedev/capability.json,
 * dispatchée par gsd-tools via dispatchCapabilityCommand.
 *
 * Sous-commandes :
 *   coverage --phase <dir> [--plans <glob-dir>]
 *     Vérifie que chaque requirement GDD (ID `GDD-<SYS>-RNN`) déclaré dans les
 *     GDD-*.md de la phase est référencé par au moins un PLAN*.md.
 *     Sortie JSON : { ok, total, covered, missing[], gdd_files, plan_files }.
 *     exitCode 1 si couverture incomplète — c'est le gate mécanique BLOQUANT
 *     de GGD (à la différence des verdicts directeurs, advisory).
 *
 * Convention router : même signature que les routers hôtes
 * ({ args, cwd, raw, error }) => void ; args[0] = famille, args[1] = sous-commande.
 */

const fs = require('node:fs');
const path = require('node:path');

const RID_RE = /\bGDD-[A-Z0-9]+(?:-[A-Z0-9]+)*-R\d+\b/g;

function collectIds(file) {
  const src = fs.readFileSync(file, 'utf8');
  return new Set(src.match(RID_RE) ?? []);
}

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && predicate(f))
    .map((f) => path.join(dir, f));
}

function runCoverage({ phaseDir, plansDir }) {
  const gddFiles = listFiles(phaseDir, (f) => /GDD/i.test(f));
  const planFiles = listFiles(plansDir ?? phaseDir, (f) => /PLAN/i.test(f));

  const declared = new Set();
  for (const f of gddFiles) for (const id of collectIds(f)) declared.add(id);

  const referenced = new Set();
  for (const f of planFiles) for (const id of collectIds(f)) referenced.add(id);

  const missing = [...declared].filter((id) => !referenced.has(id)).sort();
  return {
    ok: missing.length === 0,
    total: declared.size,
    covered: declared.size - missing.length,
    missing,
    gdd_files: gddFiles.map((f) => path.basename(f)),
    plan_files: planFiles.map((f) => path.basename(f)),
  };
}

function routeGgdGddCommand({ args, cwd, raw, error }) {
  const subcommand = args[1];

  if (subcommand !== 'coverage') {
    error('Unknown ggd-gdd subcommand. Available: coverage');
    return;
  }

  let phaseDir = null;
  let plansDir = null;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) phaseDir = args[++i];
    else if (args[i] === '--plans' && args[i + 1]) plansDir = args[++i];
  }
  if (!phaseDir) {
    error('ggd-gdd coverage requires --phase <dir>');
    return;
  }

  const base = cwd ?? process.cwd();
  const result = runCoverage({
    phaseDir: path.resolve(base, phaseDir),
    plansDir: plansDir ? path.resolve(base, plansDir) : null,
  });

  process.stdout.write(JSON.stringify(result, null, raw ? 0 : 2) + '\n');
  if (!result.ok) process.exitCode = 1;
}

module.exports = { routeGgdGddCommand, runCoverage, RID_RE };
