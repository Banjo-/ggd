---
name: gsd:gamedev-knowledge-context
description: Produce the project knowledge hub (engine version safety, conventions) for packs and gates
argument-hint: "[--draft | --interactive] [--engine-version <v>]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Agent
requires: [gamedev-gate-check]
---
<objective>
Produce `.planning/knowledge/project-context.md` from the template:

@~/.claude/gsd-core/templates/ggd/project-context.md

This file is the project's **engine truth**: pinned engine version, version-safety risk
table (knowledge-cutoff protection), module structure, conventions, framework classes,
and the exact build/verify commands executors must run. Knowledge packs (UES-style)
read it first to turn generic engine advice into project-specific advice; the
TD-ARCHITECTURE gate treats a missing or stale file as a finding.
</objective>

<modes>
- `--draft` *(default when project files are detectable)* — auto-draft by scanning,
  then present the draft for review before writing.
- `--interactive` — section-by-section questionnaire (one section at a time, 2-4
  options where applicable; the user's answers are authoritative).
- `--engine-version <v>` — override the pinned version explicitly. The flag wins over
  any scanned value.
</modes>

<auto_draft_scan>
Scan, in order, whatever exists:

1. **Unreal:** `*.uproject` (`EngineAssociation` → pinned version; `Plugins` list;
   `Modules` list), `Source/*/*.Build.cs` (module dependencies), `Source/*/*.Target.cs`,
   `Config/DefaultEngine.ini` (framework classes, renderer settings).
2. **Godot:** `project.godot` (`config/features` → version), `addons/`.
3. **Unity:** `ProjectSettings/ProjectVersion.txt`, `Packages/manifest.json`.
4. **Conventions:** sample 5-10 source files to infer naming/assertion/log patterns —
   present inferences as PROPOSED, never as fact.
5. **Knowledge packs:** list installed packs (`.claude/skills/`, `.agents/skills/`) and
   note their audited-version gap against the pinned version.

For heavy scans (>~20 files), delegate to a fresh-context subagent that returns only
the filled template sections, not raw file contents.
</auto_draft_scan>

<version_safety_rules>
- The pinned version comes from the scan or the flag — NEVER from model memory.
- If no version is detectable and no flag given: STOP and ask. A project-context
  without a pinned version is worse than none (false confidence).
- Fill the risk table relative to the model's knowledge cutoff: versions released
  after the cutoff are HIGH ("never assert from memory"); the gap between installed
  knowledge-pack audit versions and the pinned version is recorded explicitly.
</version_safety_rules>

<execution>
1. Resolve mode and scan (or question) per the sections above.
2. Build the document from the template — every `{placeholder}` either filled or
   explicitly marked `UNKNOWN (ask the user)`. Never silently drop a section.
3. Show the draft; on approval write to `.planning/knowledge/project-context.md`
   (create the directory if needed).
4. Print the version-safety summary line, e.g.:
   `Engine pinned: UE 5.8 · model-safe ≤5.5 · packs audited ~5.6 · HIGH-risk gap: 5.7-5.8`
5. Suggest the natural next step: re-run after engine upgrades; `/gsd:gamedev-gate-check`
   now has its TD-ARCHITECTURE context.
</execution>

<must_not_do>
- Never write the file with an engine version asserted from model memory.
- Never overwrite an existing project-context.md without showing a diff of what changes.
- Never copy raw scanned file contents into the document — it is a distilled hub,
  not a dump (target: readable in one screen per section).
</must_not_do>
