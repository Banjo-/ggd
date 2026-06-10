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
# Deux familles d'exceptions, et seulement deux :
#   1. Rebranding (décision §7 du guide) — identité du paquet/plugin.
#   2. Artefacts GÉNÉRÉS — régénérés par `npm run build` quand on ajoute la
#      capability gamedev ; un conflit s'y résout en régénérant, jamais à la main.
ALLOWLIST=(
  "package.json"
  "package-lock.json"
  "README.md"
  ".claude-plugin/plugin.json"
  "gsd-core/bin/lib/capability-registry.cjs"
  "gsd-core/bin/lib/loop-host-contract.cjs"
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
