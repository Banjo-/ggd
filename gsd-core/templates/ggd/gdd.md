# GDD — {System Name}

> Game Design Document for one system. Written by `/gsd:gamedev-gdd-phase` at
> discuss time; consumed by the planner; coverage enforced by
> `gsd-tools ggd-gdd coverage` before execution.
>
> **Requirement IDs:** every requirement carries an ID `GDD-{SYS}-RNN`
> (e.g. `GDD-COMBAT-R03`). Plans MUST reference these IDs in their tasks —
> that reference is what the mechanical coverage gate checks. IDs are
> append-only: never renumber, never reuse a retired ID.

## 1. Overview

{What this system is, in 3-5 sentences. Which game pillar(s) it serves (cite
the locked decisions D-xx from PROJECT.md). What is explicitly out of scope.}

## 2. Player Fantasy

{What the player FEELS when this system works. The experience target the
implementation must protect — this is what the creative director judges
against at gate CD-PILLARS.}

## 3. Detailed Rules

{The mechanics, exhaustively. Each rule that the implementation must honor is
a requirement with an ID:}

- **GDD-{SYS}-R01** — {rule}
- **GDD-{SYS}-R02** — {rule}

## 4. Formulas

{Every numeric relationship, exactly. A formula without exact semantics is a
bug factory. Each formula is a requirement:}

- **GDD-{SYS}-R10** — `{damage = base * (1 + str/100)}` — {units, rounding,
  clamps, when evaluated}

## 5. Edge Cases

{What happens at the boundaries. Each resolved edge case is a requirement:}

- **GDD-{SYS}-R20** — {edge case → mandated behavior}

## 6. Dependencies

{Systems this one reads from / writes to. State OWNERSHIP explicitly (who may
mutate what — the technical director judges this at TD-ARCHITECTURE).
Reference `design/registry/entities.yaml` entries when they exist.}

## 7. Tuning Knobs

{Values designers will iterate on. Each knob: name, default, range, where it
lives (data asset / config — NEVER hardcoded in `src/gameplay/`).}

| Knob | Default | Range | Lives in |
|------|---------|-------|----------|
| {…} | {…} | {…} | {…} |

## 8. Acceptance Criteria

{How we know each requirement is met. Map every R-ID to a verifiable check —
this section feeds the GSD verification loop:}

| Requirement | Acceptance check | Evidence |
|-------------|------------------|----------|
| GDD-{SYS}-R01 | {testable statement} | {unit test / playtest / screenshot} |
