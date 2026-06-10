# Project Knowledge Context

> Written to `.planning/knowledge/project-context.md` by `/gsd:gamedev-knowledge-context`.
> Read FIRST by knowledge packs, executors and the TD-ARCHITECTURE gate before any
> engine API claim. **The engine version is what this file says — never what a model
> remembers.**

## Engine

- **Engine:** {Unreal Engine | Godot | Unity | other}
- **Pinned version:** {exact version, e.g. 5.8} — source: {`.uproject` EngineAssociation | user}
- **Target platforms:** {Win64, …}
- **Language(s):** {C++ | GDScript | C# | Blueprint mix — with split if relevant}

## Engine Version Safety

> Knowledge-cutoff risk assessment. APIs from versions released after the model's
> training data are HIGH risk: verify against engine sources/docs before suggesting.

| Range | Risk | Rule |
|-------|------|------|
| ≤ {safe version} | LOW | Model knowledge generally reliable |
| {safe+1} … {pinned-1} | MEDIUM | Verify deprecations before use |
| {pinned} | **HIGH** | Never assert from memory — check sources, docs or knowledge packs |

- **Installed knowledge packs:** {e.g. UES (audited against ~5.5-5.6) — gap to pinned version noted}
- **Deprecated APIs to avoid:** {list or link}

## Modules & Structure

| Module | Type | Purpose |
|--------|------|---------|
| {name} | Runtime/Editor | {one line} |

- **Plugins enabled:** {GameplayAbilities, EnhancedInput, …}
- **Source layout:** {Source/<Module>/…, conventions}

## Conventions

- **Naming:** {prefixes, casing — e.g. A/U/F/E prefixes, bEnabled booleans}
- **Assertions/logging:** {check() policy, log categories}
- **Memory/GC rules:** {e.g. TObjectPtr<> mandatory on UPROPERTYs (5.3+), no TSharedPtr on UObjects}
- **Hot paths:** {zero-allocation rules, frame budgets if declared}

## Framework Classes

| Role | Class |
|------|-------|
| GameMode | {…} |
| PlayerController | {…} |
| Character/Pawn | {…} |
| GAS usage | {yes/no — AttributeSets, AbilitySystemComponent owner} |

## Team Context

- **Source control:** {git, P4 — branch policy}
- **Review policy:** {…}
- **Build/verify commands:** {exact Build.bat / editor-cmd invocations used by executors}
