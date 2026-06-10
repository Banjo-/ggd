---
name: gsd:gamedev-gdd-phase
description: Produce a GDD design contract for a phase's game system, with traceable requirement IDs
argument-hint: "[phase number] [system name] [--review full|lean|solo]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Agent
requires: [gamedev-knowledge-context, gamedev-gate-check, plan-phase]
---
<objective>
Produce `GDD-{SYS}.md` in the phase directory — the design contract the planner
consumes and the coverage gate enforces. Template (8 sections, requirement IDs
`GDD-{SYS}-RNN`):

@~/.claude/gsd-core/templates/ggd/gdd.md

Downstream contract: every R-ID declared here must be referenced by a PLAN task —
checked mechanically by `gsd-tools ggd-gdd coverage --phase <dir>` (blocking,
unlike the advisory director gates of /gsd:gamedev-gate-check).
</objective>

<review_mode_resolution>
CLI flag `--review <mode>` → `.planning/config.json` key `gamedev.review_mode` →
default `lean`.
</review_mode_resolution>

<execution>
1. **Gather context.** Read `PROJECT.md` (pillars, locked decisions D-xx), the phase
   `CONTEXT.md` if present, `.planning/knowledge/project-context.md` (run
   `/gsd:gamedev-knowledge-context` first if missing — engine constraints shape
   design feasibility), and `design/registry/entities.yaml` when it exists.

2. **Create the file skeleton FIRST** — all 8 section headings, empty bodies, written
   to disk immediately. Context-loss protection: a crash mid-design loses one
   section's discussion, not the document.

3. **Fill section by section**, consulting `ggd-game-designer` (fresh-context agent,
   gets a `<required_reading>` block with the context files):

   - **Mode `full`** — collaborative cycle per section: clarifying questions first →
     2-4 options with trade-offs and an explicit recommendation ("this is your
     call") → user decides (trace pillar-touching choices as locked decisions
     D-xx) → draft shown → user approves → section written to disk. The context
     carries only the CURRENT section's discussion.
   - **Mode `lean` / `solo`** — direct drafting from the consultant, written
     section by section; surface only pillar-conflicts and genuinely open design
     questions to the user.

4. **Validate before handoff:**
   - every requirement has an ID matching `GDD-{SYS}-RNN`, IDs unique, bands
     respected (rules R01+, formulas R10+, edge cases R20+);
   - every formula has units, rounding, clamps;
   - every tuning knob has a home that is not source code;
   - section 8 maps every R-ID to an acceptance check.

5. **Update the registry** (`design/registry/entities.yaml`): entities, formulas and
   constants this GDD introduces, with this GDD as authoritative source. Create the
   file on first use.

6. **Handoff.** Tell the user the GDD is ready for `/gsd:plan-phase`, and that after
   planning, coverage is checked with:
   `gsd-tools ggd-gdd coverage --phase .planning/phases/{phase}/` — any missing R-ID
   blocks execution. In mode `full`, suggest `/gsd:gamedev-gate-check` for the
   director pass (CD-PILLARS will judge fidelity to pillars).
</execution>

<must_not_do>
- Never write a requirement without an R-ID — unidentified requirements are
  invisible to the coverage gate, which is how scope silently leaks.
- Never decide a pillar-touching design question yourself in mode full — options,
  recommendation, user decides.
- Never put a tunable value's home in source code.
- Never rewrite history: R-IDs are append-only, retired requirements are struck
  through with a rationale, never deleted.
</must_not_do>
