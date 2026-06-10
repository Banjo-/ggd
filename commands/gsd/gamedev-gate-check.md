---
name: gsd:gamedev-gate-check
description: Run GGD director gates on a phase and record advisory verdicts in GATE-REPORT.md
argument-hint: "[phase number, e.g. '4'] [--review full|lean|solo] [--milestone]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Agent
---
<objective>
Spawn the four GGD director judges in parallel on a phase's planning artifacts, collect
their first-line verdicts, and write an advisory `GATE-REPORT.md` into the phase directory.

Verdicts are ADVISORY: they inform the user's decision and never block the loop by
themselves. The registry of gates (IDs, triggers, context lists, prompt templates,
verdict contract) is the single source of truth:

@~/.claude/gsd-core/references/ggd/gates.md
</objective>

<review_mode_resolution>
Resolve the review mode in this order (first match wins):

1. CLI flag `--review <mode>` (`full` | `lean` | `solo`).
2. `.planning/config.json` key `gamedev.review_mode`.
3. Default: `lean`.

Behavior by mode:
- `solo` → print "review mode solo — director gates skipped" and STOP. Do not spawn.
- `lean` → run only when invoked with `--milestone` (milestone transition); otherwise
  print "review mode lean — gates run at milestone transitions (use --review full to
  force)" and STOP.
- `full` → always run.
</review_mode_resolution>

<execution>
1. **Locate the phase.** Resolve the phase directory under `.planning/phases/` from the
   argument. Collect, when they exist: `PROJECT.md`, `STATE.md`, `ROADMAP.md`,
   `REQUIREMENTS.md`, the phase `PLAN.md` files, `GDD-*.md`, `ART-BIBLE.md`,
   `UX-SPEC.md`, `.planning/knowledge/project-context.md`, relevant ADRs.

2. **Skip rule for AD-COHERENCE.** If no plan in the phase touches player-facing content
   (UI, VFX, audio, animation, presentation), note "AD-COHERENCE: skipped (code-only
   phase)" instead of spawning that judge.

3. **Spawn all applicable judges in ONE parallel wave** (single message, one Task per
   judge — never sequentially):
   - `ggd-creative-director` ← gate CD-PILLARS context list from the registry
   - `ggd-technical-director` ← gate TD-ARCHITECTURE context list
   - `ggd-producer` ← gate PR-SCOPE context list
   - `ggd-art-director` ← gate AD-COHERENCE context list (unless skipped)

   Each prompt includes: the gate's prompt template from the registry (with {phase}
   substituted), a `<required_reading>` block listing the context file paths collected
   in step 1, and the reminder that the FIRST LINE of the reply must be the verdict in
   the mandated format.

4. **Parse verdicts.** For each reply, the first line must match
   `[<GATE-ID>]: APPROVE|CONCERNS|REJECT`. If a reply does not, record its verdict as
   `MALFORMED` and quote the first line verbatim — never reinterpret prose into a verdict.

5. **Write `GATE-REPORT.md`** in the phase directory:

   ```markdown
   # Gate Report — Phase {phase}

   > Mode: {resolved mode} · {date} · advisory — the user decides.

   | Gate | Verdict |
   |------|---------|
   | CD-PILLARS | APPROVE/CONCERNS/REJECT/MALFORMED/SKIPPED |
   | TD-ARCHITECTURE | … |
   | PR-SCOPE | … |
   | AD-COHERENCE | … |

   ## Findings
   (full rationale of each judge, verbatim, one section per gate)
   ```

6. **Surface the outcome.** Print the verdict table to the user. If any REJECT: highlight
   it first with the judge's named violation, and remind that the verdict is advisory —
   options are (a) revise the plan, (b) overrule with a one-line rationale that gets
   appended to GATE-REPORT.md as a decision record.

7. **Autonomous runs.** When running under an autonomous orchestration (no interactive
   user), never pause on verdicts: write GATE-REPORT.md and continue. REJECT verdicts
   surface in the ship-time digest. Exception: if `.planning/config.json` sets
   `gamedev.autonomous_halt_on_reject: true`, a REJECT triggers the standard GSD
   checkpoint protocol instead.
</execution>

<must_not_do>
- Never block on a director verdict in autonomous mode (unless halt_on_reject).
- Never edit PLAN.md, GDD or any planning artifact — judges are read-only and this
  orchestrator only writes GATE-REPORT.md.
- Never paraphrase a judge's verdict: first line is parsed literally, rationale is
  quoted verbatim.
- Never spawn judges sequentially — one parallel wave.
</must_not_do>
