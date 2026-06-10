# GGD Director Gates Registry

Single source of truth for director gates. Skills and agents reference gates **by ID** —
never by copying prompt text. A change here propagates everywhere without drift.
Enforced by `scripts/ggd/lint-gates.cjs` (every ID referenced anywhere must exist here).

**Verdict contract (all gates):** the judging agent's reply MUST start, on its very first
line, with:

```
[<GATE-ID>]: APPROVE | CONCERNS | REJECT
```

Rationale follows below the verdict line. Never bury the verdict inside paragraphs.

**Philosophy:** director verdicts are ADVISORY — they inform the user's decision, they
never block the loop by themselves. Mechanical gates (requirement coverage, hooks) block;
judgment gates advise. In autonomous runs, verdicts are recorded in the phase artifacts
and aggregated into `REVIEW-DIGEST.md` at ship time instead of being raised as questions
(interactive = gates as questions; autonomous = gates as artifacts).

**Review mode resolution (all gates):** CLI flag `--review <mode>` → `.planning/config.json`
key `gamedev.review_mode` → default `lean`.

| Mode | Behavior |
|------|----------|
| `full` | All four gates run at every `plan:post`, plus milestone transitions |
| `lean` *(default)* | All four gates run at milestone transitions only |
| `solo` | No director gates (mechanical gates still apply) |

---

## CD-PILLARS

- **Judge:** `ggd-creative-director` (model: per `model_overrides`, recommended `claude-fable-5`)
- **Trigger:** `plan:post` (mode `full`) ; milestone transition (mode `lean`)
- **Question:** Does this plan serve the game's pillars and creative vision?
- **Context to pass:** `PROJECT.md` (pillars as locked decisions D-xx), the phase `GDD-*.md`
  if present, `PLAN.md` files of the phase, `STATE.md` position summary.
- **Prompt template:**

  > You are judging gate CD-PILLARS for phase {phase}. Read the provided context.
  > Evaluate: (1) does each planned task trace back to a pillar or a GDD requirement,
  > (2) does any task contradict a locked decision D-xx, (3) is scope creep diluting
  > the core fantasy? Render your verdict in the mandated first-line format, then list
  > each finding with the pillar/decision it touches.

- **Verdicts:** `APPROVE` (serves the vision) / `CONCERNS` (list them, advisory) /
  `REJECT` (a locked pillar or D-xx is violated — name it).

---

## TD-ARCHITECTURE

- **Judge:** `ggd-technical-director` (model: per `model_overrides`, recommended `claude-fable-5`)
- **Trigger:** `plan:post` (mode `full`) ; milestone transition (mode `lean`)
- **Question:** Is the technical approach sound for this engine and this team?
- **Context to pass:** `.planning/knowledge/project-context.md` (engine + pinned version,
  conventions), the phase `PLAN.md` files, `GDD-*.md` Dependencies/Formulas sections,
  relevant ADRs if present.
- **Prompt template:**

  > You are judging gate TD-ARCHITECTURE for phase {phase}. Read the provided context.
  > Evaluate: (1) engine-version safety — do planned APIs match the pinned engine version
  > (knowledge cutoff risk), (2) ownership — does any plan mutate state owned by another
  > system, (3) performance budgets stated in the GDD (frame-time, memory) reflected in
  > acceptance criteria, (4) dependency legitimacy. First-line verdict, then findings.

- **Verdicts:** `APPROVE` / `CONCERNS` / `REJECT` (architecture builds on a wrong or
  unverified engine assumption — name the API/version).

---

## PR-SCOPE

- **Judge:** `ggd-producer` (model: per `model_overrides`)
- **Trigger:** `plan:post` (mode `full`) ; milestone transition (mode `lean`)
- **Question:** Is the scope realistic and sequenced for shipping?
- **Context to pass:** `ROADMAP.md`, `STATE.md` (velocity signals, blockers),
  the phase `PLAN.md` files, `REQUIREMENTS.md` v1/v2 split.
- **Prompt template:**

  > You are judging gate PR-SCOPE for phase {phase}. Read the provided context.
  > Evaluate: (1) is the phase sized to fit one loop without degrading (good phase scope:
  > one-sentence goal, bounded research, testable done), (2) are v2 items leaking into v1,
  > (3) are dependencies between plans declared and wave-parallelizable, (4) is there a
  > shippable increment at the end. First-line verdict, then findings.

- **Verdicts:** `APPROVE` / `CONCERNS` / `REJECT` (the phase cannot ship as scoped —
  propose the split).

---

## AD-COHERENCE

- **Judge:** `ggd-art-director` (model: per `model_overrides`)
- **Trigger:** milestone transition (modes `full` and `lean`) ; skipped when the phase
  touches no player-facing content (code-only phases).
- **Question:** Does the planned work keep the audiovisual identity coherent?
- **Context to pass:** `ART-BIBLE.md` if present, `UX-SPEC.md` if present, the phase
  `GDD-*.md` Player Fantasy section, `PLAN.md` files touching presentation.
- **Prompt template:**

  > You are judging gate AD-COHERENCE for phase {phase}. Read the provided context.
  > Evaluate: (1) do planned visuals/audio/UX choices match the art bible's stated
  > identity, (2) are readability and accessibility constraints (contrast, text size,
  > colorblind safety) carried into acceptance criteria, (3) is any placeholder asset
  > flagged as placeholder with a replacement task. First-line verdict, then findings.

- **Verdicts:** `APPROVE` / `CONCERNS` / `REJECT` (identity break against the art
  bible — cite the section).
