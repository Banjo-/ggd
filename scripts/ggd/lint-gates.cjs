#!/usr/bin/env node
'use strict';

/**
 * lint-gates.cjs — linter GGD du registre de gates.
 *
 * Garanties (échec = exit 1) :
 *   1. Le registre gsd-core/references/ggd/gates.md existe et déclare ≥ 1 gate
 *      (heading `## <GATE-ID>`).
 *   2. Chaque gate du registre nomme un juge (`ggd-*`) qui existe dans agents/.
 *   3. Chaque agent juge :
 *      - a un frontmatter `name:` égal à son nom de fichier ;
 *      - déclare le format de verdict première ligne pour SON gate
 *        (`[<GATE-ID>]: APPROVE` apparaît dans le corps) ;
 *      - est en moindre privilège : pas de Write/Edit/Bash dans `tools:`.
 *   4. Tout ID de gate référencé (pattern `[XX-YYY]:`) dans agents/ggd-*.md et
 *      commands/gsd/gamedev-*.md existe dans le registre — pas de gate fantôme.
 *   5. La capability gamedev déclare exactement les juges du registre.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const GATES_PATH = path.join(ROOT, 'gsd-core', 'references', 'ggd', 'gates.md');
const AGENTS_DIR = path.join(ROOT, 'agents');
const COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const CAP_PATH = path.join(ROOT, 'capabilities', 'gamedev', 'capability.json');

const errors = [];

// ── 1. Registre ───────────────────────────────────────────────────────────────
if (!fs.existsSync(GATES_PATH)) {
  console.error(`ÉCHEC lint-gates: registre absent: ${GATES_PATH}`);
  process.exit(1);
}
const gatesSrc = fs.readFileSync(GATES_PATH, 'utf8');
const gateIds = [...gatesSrc.matchAll(/^## ([A-Z]{2}-[A-Z][A-Z-]*)$/gm)].map((m) => m[1]);
if (gateIds.length === 0) {
  errors.push('le registre ne déclare aucun gate (heading attendu: "## <XX-YYY>")');
}

// ── 2. Juges nommés par le registre ──────────────────────────────────────────
const judgeByGate = {};
for (const id of gateIds) {
  const section = gatesSrc.split(new RegExp(`^## ${id}$`, 'm'))[1]?.split(/^## /m)[0] ?? '';
  const judge = section.match(/\*\*Judge:\*\* `(ggd-[a-z-]+)`/)?.[1];
  if (!judge) {
    errors.push(`gate ${id}: aucun juge déclaré (attendu: **Judge:** \`ggd-...\`)`);
    continue;
  }
  judgeByGate[id] = judge;
  const agentPath = path.join(AGENTS_DIR, `${judge}.md`);
  if (!fs.existsSync(agentPath)) {
    errors.push(`gate ${id}: juge ${judge} introuvable (${agentPath})`);
  }
}

// ── 3. Contrats des agents juges ─────────────────────────────────────────────
for (const [id, judge] of Object.entries(judgeByGate)) {
  const agentPath = path.join(AGENTS_DIR, `${judge}.md`);
  if (!fs.existsSync(agentPath)) continue;
  const src = fs.readFileSync(agentPath, 'utf8');

  const fmName = src.match(/^name:\s*(\S+)/m)?.[1];
  if (fmName !== judge) {
    errors.push(`${judge}: frontmatter name "${fmName}" ≠ nom de fichier`);
  }

  if (!src.includes(`[${id}]: APPROVE`)) {
    errors.push(`${judge}: ne déclare pas le format de verdict première ligne pour ${id}`);
  }

  const tools = src.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
  for (const forbidden of ['Write', 'Edit', 'Bash']) {
    if (new RegExp(`\\b${forbidden}\\b`).test(tools)) {
      errors.push(`${judge}: outil interdit pour un juge read-only: ${forbidden}`);
    }
  }
}

// ── 4. Pas de gate fantôme ───────────────────────────────────────────────────
const knownIds = new Set(gateIds);
const filesToScan = [
  ...fs.readdirSync(AGENTS_DIR).filter((f) => f.startsWith('ggd-')).map((f) => path.join(AGENTS_DIR, f)),
  ...fs.readdirSync(COMMANDS_DIR).filter((f) => f.startsWith('gamedev-')).map((f) => path.join(COMMANDS_DIR, f)),
];
for (const file of filesToScan) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\[([A-Z]{2}-[A-Z][A-Z-]*)\]:/g)) {
    if (!knownIds.has(m[1])) {
      errors.push(`${path.relative(ROOT, file)}: référence un gate inconnu du registre: ${m[1]}`);
    }
  }
}

// ── 5. Cohérence avec le manifeste de capability ─────────────────────────────
try {
  const cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
  const declared = new Set(cap.agents);
  for (const judge of Object.values(judgeByGate)) {
    if (!declared.has(judge)) {
      errors.push(`capability gamedev: juge ${judge} absent du manifeste (agents: [...])`);
    }
  }
} catch (e) {
  errors.push(`manifeste gamedev illisible: ${e.message}`);
}

// ── Verdict ───────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`ÉCHEC lint-gates (${errors.length} erreur(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK lint-gates: ${gateIds.length} gates, ${Object.keys(judgeByGate).length} juges, 0 gate fantôme.`);
