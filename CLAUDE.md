# GGD — instructions pour l'agent (chargé automatiquement par Claude Code)

Ce dépôt est **GGD (Get Games Done)** : un **soft-fork additif** de
[open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) qui le spécialise pour le
développement de jeux vidéo. Lis `GGD.md` (discipline du fork) avant toute modification.
Les documents de conception vivent dans `~/projects/comp/` : `DOCUMENT-DE-TRAVAIL.md`
(le quoi/pourquoi) et `GUIDE-MISE-EN-PLACE-GGD.md` (le comment, jalons).

## Les règles d'airain (violations = CI rouge)

1. **Additif strict** : ne JAMAIS modifier un fichier upstream hors allowlist
   (`scripts/ggd/check-additive.sh` — 4 familles : rebranding, artefacts générés,
   registres de parité, divergences assumées). Tout le neuf vit dans :
   `capabilities/gamedev/`, `agents/ggd-*`, `commands/gsd/gamedev-*`,
   `gsd-core/{templates,references}/ggd/`, `gsd-core/bin/lib/ggd-*.cjs`,
   `scripts/ggd/`, `tests/ggd-*`.
2. **`npm test` COMPLET avant tout push** — jamais `node --test` seul : les linters
   tournent en pretest (`lint:skill-deps`, budgets de description, scan anti-injection…)
   et la CI les exécute. Durée ~6 min, c'est le prix d'un push vert.
3. **Pas de PR upstream** (décision utilisateur 10/06/2026) : un besoin hors-contrat
   devient une *divergence assumée* — modification minimale, généralisée (jamais un
   contournement), allowlistée famille 4 avec consigne de résolution de conflit.
4. **Actions externes** (publication, PR, repo public) : TOUJOURS demander à
   l'utilisateur explicitement — les permissions les bloquent de toute façon.

## L'oignon de parité — checklist pour AJOUTER une skill

Upstream exige l'enregistrement de toute nouvelle commande dans N registres. Liste
complète, apprise à la dure (chaque oubli = CI rouge) :

- [ ] `commands/gsd/gamedev-<nom>.md` — frontmatter `name: gsd:gamedev-<nom>`,
      **description ≤ 100 caractères** (enh-2789), `requires:` listant TOUTE commande
      `gsd:*` mentionnée dans le corps (lint-skill-deps).
- [ ] `capabilities/gamedev/capability.json` → `skills[]`, puis
      `node scripts/gen-capability-registry.cjs --write`.
- [ ] `gsd-core/workflows/help/modes/full.md` — entrée dans la section
      `### Game Development (GGD)` avec **tous les flags** de l'argument-hint
      (bug-2954, parité bidirectionnelle). ⚠️ jamais de placeholder `[system]` —
      le scan anti-injection matche `\[SYSTEM\]` ; utiliser `[system-name]`.
- [ ] `src/clusters.cts` → cluster `gamedev`, puis `npm run build:lib`.
- [ ] `commands/gsd/ns-review.md` (ou le routeur ns-* pertinent) — `requires:` +
      ligne de table de routage (enh-2792).
- [ ] `tests/enh-2790-skill-consolidation.test.cjs` → `KNOWN_SKILLS` (tri alphabétique).
- [ ] `docs/INVENTORY.md` — bump du headline `## Commands (N shipped)` + ligne ;
      puis `node scripts/gen-inventory-manifest.cjs --write`.
- [ ] Pas de caractères Unicode invisibles (ZWSP !) dans les fichiers — le scan les rejette.

**Pour un agent** : `agents/ggd-<nom>.md` + `capability.json agents[]` + ligne INVENTORY
(le headline Agents ne compte que `gsd-*`, ne PAS le bumper). **Pour un module CLI** :
`gsd-core/bin/lib/ggd-*.cjs` + headline `## CLI Modules` +1 + ligne + manifest.
**Pour un heading dans full.md** : `INTENTIONAL_ORPHANS` dans
`tests/feat-3039-help-tiered.test.cjs`.

## État livré (10 juin 2026) — jalons 0-3 du guide

**Capability `gamedev`** (gabarit : capability `ui` d'upstream) :
- **Skills** : `gamedev-gate-check` (4 directeurs en vague parallèle → `GATE-REPORT.md`,
  verdicts advisory `[GATE-ID]: APPROVE|CONCERNS|REJECT` première ligne),
  `gamedev-knowledge-context` (hub `.planning/knowledge/project-context.md`, Engine
  Version Safety : version TOUJOURS scannée/déclarée, jamais de la mémoire du modèle),
  `gamedev-gdd-phase` (GDD 8 sections, R-IDs `GDD-{SYS}-RNN` append-only, squelette
  d'abord, cycle collaboratif en mode full).
- **Agents** : 4 juges read-only (`ggd-{creative,technical}-director`, `ggd-producer`,
  `ggd-art-director` — gates définis par ID dans `gsd-core/references/ggd/gates.md`,
  linté par `scripts/ggd/lint-gates.cjs`) + `ggd-game-designer` (consultant).
- **Config fédérée** : `gamedev.review_mode` (enum full/lean/solo, défaut lean),
  `workflow.gdd_phase`, `workflow.director_gates`, `gamedev.autonomous_halt_on_reject`.
- **Famille CLI `ggd-gdd`** (PREMIER usage réel d'ADR-959/commandFamilies) :
  `gsd-tools ggd-gdd coverage --phase <dir>` — couverture R-ID GDD→plans, exit 1 si
  incomplète. C'est le gate mécanique BLOQUANT (vs directeurs advisory).
- **Steps/gates au registre** : gdd-phase à `discuss:post`, gate-check à `plan:post`,
  gate bloquant `ggd-gdd.coverage` à `execute:pre`. ⚠️ Déclaratif seulement : la boucle
  upstream n'exécute pas (encore) les steps de capability — l'exécutable passe par les
  skills et le CLI.

**Divergences assumées** (2) : `tests/federated-config.test.cjs` §8 et
`tests/capability-command-dispatch.test.cjs` (états transitoires de monde fermé
généralisés). En cas de conflit au merge upstream : garder notre version, vérifier
qu'elle couvre les nouvelles assertions upstream.

**Écosystème** :
- `~/projects/ggd-knowledge` (GitHub `Banjo-/ggd-knowledge`, **privé**) : UES vendoré
  (submodule), `scripts/lint-pack.cjs` (≤500 lignes wc -l, sections obligatoires,
  `--strict` pour les packs maison). 3 warnings UES connus (Common Mistakes manquantes).
- `~/projects/pilote-jeu` : pilote UE 5.8, protocole de test dans `TESTS-PILOTE.md`,
  tourne côté **Windows natif** (décision : WSL = web + dev GGD ; Windows = jeux).

## Rituel de sync upstream (à chaque release gsd-core)

```bash
git fetch upstream && git merge upstream/next   # base = next, pas main
npm run build && npm test
node --test tests/ggd-*.test.cjs && node scripts/ggd/lint-gates.cjs
bash scripts/ggd/check-additive.sh upstream/next
```

Conflits attendus : fichiers générés (→ régénérer), registres de parité (→ ré-appliquer
nos lignes), divergences famille 4 (→ garder notre version, re-couvrir).

## Backlog (ordre suggéré)

1. **Boucle de retour du pilote** : trier le `JOURNAL.md` du pilote (quand l'utilisateur
   l'aura déroulé sur Windows) — chaque friction devient un correctif ici. PRIORITAIRE
   sur tout le reste : ne pas construire plus avant d'avoir ces données.
2. **REVIEW-DIGEST autonome** : step `ship:pre` agrégeant les CONCERNS/REJECT des
   GATE-REPORT.md de toutes les phases (le protocole « autonome = gates en artefacts »
   n'a pas encore son agrégateur).
3. **`entities.yaml` + consistency-check** : registre d'entités/formules (gdd-phase
   le remplit déjà) + skill de vérification grep-first (modèle CCGS).
4. **Templates art-bible / ux-spec** + production aux bons points de boucle.
5. **Hook validate-commit gameplay** : valeurs en dur dans `src/gameplay/` (advisory,
   modèle CCGS) — famille hooks de la capability.
6. **Packs Godot/Unity** dans ggd-knowledge (format UES, linter `--strict`) ; contribuer
   les 2 sections Common Mistakes manquantes à UES (action externe → demander).
7. **Rebranding `@ggd/core`** : package.json name, plugin.json (name GGD), README —
   les 3 fichiers sont déjà allowlistés famille 1. À faire avant toute distribution npm.
8. **Méta-qualité** : porter le patron skill-test de CCGS (lint structurel des skills
   gamedev : verdict 1ère ligne, handoff de fin, langage d'approbation en mode full).

## Aide-mémoire commandes

```bash
npm test                                          # LA validation (pretest linters inclus)
npm run build                                     # régénère TOUS les artefacts générés
node scripts/gen-capability-registry.cjs --check  # registre frais ?
node scripts/gen-inventory-manifest.cjs --write   # après édition INVENTORY.md
node scripts/ggd/lint-gates.cjs                   # cohérence gates ↔ juges ↔ manifeste
bash scripts/ggd/check-additive.sh upstream/next  # le garde-fou, en local
node --test tests/ggd-*.test.cjs                  # tests GGD seuls (rapide, PAS suffisant)
node gsd-core/bin/gsd-tools.cjs ggd-gdd coverage --phase <dir>   # le gate GDD
```
