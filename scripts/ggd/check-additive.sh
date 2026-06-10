#!/usr/bin/env bash
# check-additive.sh — garde-fou additif du fork GGD.
#
# Garantit la promesse d'upgradabilité : GGD n'ajoute que des fichiers nouveaux
# par rapport à upstream (open-gsd/gsd-core). Toute MODIFICATION d'un fichier
# appartenant à upstream fait échouer la CI, sauf allowlist explicite ci-dessous.
#
# Usage :
#   scripts/ggd/check-additive.sh [upstream-ref]     # défaut : upstream/next
#
# La CI fetch upstream avant l'appel (voir .github/workflows/ggd.yml).
set -euo pipefail

UPSTREAM_REF="${1:-upstream/next}"

# ── Allowlist ────────────────────────────────────────────────────────────────
# Trois familles d'exceptions, et rien d'autre :
#   1. Rebranding (décision §7 du guide) — identité du paquet/plugin.
#   2. Artefacts GÉNÉRÉS — régénérés par `npm run build` quand on ajoute la
#      capability gamedev ; un conflit s'y résout en régénérant, jamais à la main.
#   3. Registres de parité exigés par le process upstream LUI-MÊME pour tout
#      agent/commande ajouté : ligne d'inventaire (gen-inventory-manifest) et
#      entrée d'aide (test bug-2954, parité bidirectionnelle help ↔ commands).
#      Conflit de merge → régénérer/ré-appliquer nos lignes.
ALLOWLIST=(
  "package.json"
  "package-lock.json"
  "README.md"
  ".claude-plugin/plugin.json"
  "gsd-core/bin/lib/capability-registry.cjs"
  "gsd-core/bin/lib/loop-host-contract.cjs"
  "docs/INVENTORY.md"
  "docs/INVENTORY-MANIFEST.json"
  "gsd-core/workflows/help/modes/full.md"
  # Clusters de skills (/gsd-surface) : tout skill ajouté doit appartenir à un
  # cluster (test runtime-artifact-layout-surface) ; source TS + artefact build.
  "src/clusters.cts"
  "gsd-core/bin/lib/clusters.cjs"
  # Routage de namespace (#2792) : tout skill doit être routé par un ns-*.md.
  "commands/gsd/ns-review.md"
  "commands/gsd/ns-context.md"
  # Registres-dans-les-tests (chemin contributeur documenté par leurs pruneHint) :
  # KNOWN_SKILLS (#2790) et INTENTIONAL_ORPHANS (#3039).
  "tests/enh-2790-skill-consolidation.test.cjs"
  "tests/feat-3039-help-tiered.test.cjs"
  # 4. DIVERGENCE ASSUMÉE (décision utilisateur 10/06/2026, PR upstream déclinée) :
  #    §8 généralisé per-clé (le test upstream supposait « toute clé fédérée est
  #    centrale », faux dès une 2e capability). Notre version est strictement plus
  #    forte. Conflit de merge → garder notre version, re-vérifier la couverture.
  "tests/federated-config.test.cjs"
)

if ! git rev-parse --verify --quiet "$UPSTREAM_REF" >/dev/null; then
  echo "ERREUR: ref upstream introuvable: $UPSTREAM_REF (faire: git fetch upstream)" >&2
  exit 2
fi

MERGE_BASE="$(git merge-base "$UPSTREAM_REF" HEAD)"

# Fichiers MODIFIÉS (pas ajoutés A, pas supprimés D) entre la base de merge et HEAD.
mapfile -t MODIFIED < <(git diff --name-only --diff-filter=M "$MERGE_BASE" HEAD)

VIOLATIONS=()
for f in "${MODIFIED[@]}"; do
  allowed=false
  for a in "${ALLOWLIST[@]}"; do
    if [[ "$f" == "$a" ]]; then allowed=true; break; fi
  done
  $allowed || VIOLATIONS+=("$f")
done

# Les suppressions de fichiers upstream sont interdites sans exception.
mapfile -t DELETED < <(git diff --name-only --diff-filter=D "$MERGE_BASE" HEAD)

if [[ ${#VIOLATIONS[@]} -eq 0 && ${#DELETED[@]} -eq 0 ]]; then
  echo "OK additif: $(git diff --name-only --diff-filter=A "$MERGE_BASE" HEAD | wc -l) fichier(s) ajouté(s), ${#MODIFIED[@]} modifié(s) (tous allowlistés), 0 supprimé."
  exit 0
fi

echo "ÉCHEC du garde-fou additif — la promesse d'upgradabilité de GGD est violée." >&2
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  echo "" >&2
  echo "Fichiers upstream MODIFIÉS hors allowlist :" >&2
  printf '  - %s\n' "${VIOLATIONS[@]}" >&2
  echo "" >&2
  echo "Options : (a) déplacer le changement dans un fichier nouveau (capabilities/gamedev/," >&2
  echo "agents/ggd-*, commands/ggd/, scripts/ggd/) ; (b) en faire une PR upstream ;" >&2
  echo "(c) si c'est un artefact généré légitime, l'ajouter à l'ALLOWLIST avec justification." >&2
fi
if [[ ${#DELETED[@]} -gt 0 ]]; then
  echo "" >&2
  echo "Fichiers upstream SUPPRIMÉS (interdit) :" >&2
  printf '  - %s\n' "${DELETED[@]}" >&2
fi
exit 1
