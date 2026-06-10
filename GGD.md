# GGD — Get Games Done

**Ce dépôt est un soft-fork additif de [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core).**

GGD spécialise GSD Core pour le développement de jeux vidéo : capability `gamedev`
(GDD comme contrat de design, gates de directeurs, modes de revue full/lean/solo),
knowledge packs moteur (Unreal via UES, Godot/Unity à venir), et affectation du
modèle Claude Fable 5 aux décisions à fort enjeu (planification, verdicts).

Documents de référence (dépôt d'analyse `comp`) :
- `DOCUMENT-DE-TRAVAIL.md` — le quoi et le pourquoi (architecture, décisions).
- `GUIDE-MISE-EN-PLACE-GGD.md` — le comment (jalons, commandes, CI).

## Discipline du fork (la promesse d'upgradabilité)

1. **Additif strict** : on ne modifie jamais un fichier appartenant à upstream.
   Tout vit dans des fichiers nouveaux : `capabilities/gamedev/`, `agents/ggd-*`,
   `commands/ggd/`, `gsd-core/templates/ggd/`, `gsd-core/references/ggd/`,
   `scripts/ggd/`, `tests/ggd-*`.
2. **Exceptions allowlistées** (et rien d'autre) : rebranding (`package.json`,
   `.claude-plugin/plugin.json`, `README.md`) et artefacts **générés** par
   `npm run build` (`capability-registry.cjs`, `loop-host-contract.cjs`).
3. **Vérification mécanique** : `scripts/ggd/check-additive.sh` échoue en CI
   (`.github/workflows/ggd.yml`) si la règle est violée.
4. **Tout besoin hors-contrat part en PR upstream**, jamais en patch local.
   File d'attente : détection 1M de `claude-fable-5`, tier `fable` +
   profil `frontier` dans `model-catalog.json`, ADR « external capability loader »
   (anticipé par ADR-857/894 — c'est la sortie du fork).

## Branches et synchronisation

- `ggd-main` — branche produit (base des releases GGD).
- La branche par défaut d'upstream est **`next`** ; rituel de sync à chaque release upstream :

```bash
git checkout ggd-main
git fetch upstream
git merge upstream/next       # conflits attendus : ~zéro (additif strict)
npm run build                 # régénère les registres (résout les conflits générés)
npm test && node --test tests/ggd-*.test.cjs
bash scripts/ggd/check-additive.sh upstream/next
```

## Licence

MIT, comme upstream. Le travail upstream reste attribué à OpenGSD.
