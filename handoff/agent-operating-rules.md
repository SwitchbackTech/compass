# Agent operating rules

Self-governance for the uninterrupted implementation window. This is what I consult to
make decisions consistently when the PO is not watching. It complements
[HANDOFF.md](./HANDOFF.md); read that first for the overall rhythm.

## Model & effort tiering (Max 5x — spend deliberately)

Match the model and reasoning effort to the work. Do not run Opus + high on everything.

| Work | Model | Effort |
|------|-------|--------|
| Morning planning, architecture, gnarly bug diagnosis | Opus | high / xhigh |
| Routine implementation, refactors, writing tests | Sonnet | medium |
| Mechanical edits, subagent fan-out, grepping docs/logs | Haiku (subagents) | low |

- Switch live with `/model` and `/effort`; set the day's default with `--model` at launch.
- Delegate wide, mechanical search to Haiku subagents (`model` option on the Agent tool)
  so the main context stays cheap and focused.
- Reach for xhigh/max only when a problem is genuinely hard — not as a default.

## Spike-budget rule (don't burn tokens on a wall)

- If an approach isn't working after **~2 genuine attempts**, stop. Do not keep grinding.
- Checkpoint (`Esc Esc` to rewind cheaply), write the dead-end + current hypothesis into
  the day's `summary.md`, then either pivot to a different approach or move to another task.
- Prefer plan mode before non-trivial work so wrong directions cost reads, not rewrites.
- Run risky experiments in a subagent or a throwaway worktree so a failed spike doesn't
  pollute or cost the main context.

## Checkpoint at clean boundaries

- Compact or start a fresh session at task boundaries, never mid-refactor.
- All resumable state lives in `workflow/<date>/summary.md` — keep it current enough that a
  fresh session (or tomorrow) can resume with zero re-derivation.
- Self-monitor with `/context` and `/usage`; log the day's token figure in `summary.md`.

## When to push-notify vs. log-and-continue

**Push-notify the PO** when I am truly blocked:

- A decision only the PO can make (product direction, ambiguous spec, external access).
- A destructive or irreversible action I'm unwilling to take autonomously.
- Weekly token limit hit — checkpoint, notify, and record the next step.

**Log under PO follow-ups and keep working** when:

- The blocker only affects one task and other spec items are still workable.
- It's a nice-to-have observation or a question that can wait for evening review.

Never idle waiting for an answer if there is other useful work in the day's spec.

## I own follow-up decisions — never hand the PO a context-free choice

Incidental issues I discover mid-work (a stray warning, dead code, a tangential
cleanup, a possible edge case) are **mine to decide**, not the PO's. I have the
full context; the PO does not.

- **Never spawn a background task chip (`spawn_task`) during the implementation
  window**, and don't otherwise manufacture a decision point for the PO. A chip
  offloads a judgment call onto someone with none of the context — the opposite of
  owning the code.
- Decide it myself: worth doing and reasonable in scope → do it (fold in or its own
  PR); a distinct larger effort not worth doing now → drop it, or record it **once**
  in `summary.md` as a backlog recommendation (an async FYI, not a decision I'm
  offloading).
- Reserve push-notify and the summary's PO follow-ups for things that **genuinely
  require the PO** — product direction, ambiguous spec, external access — not
  code-quality or scope calls I'm equipped to make.

## Resume-from-summary protocol

1. On starting a session, read the latest `handoff/<date>/summary.md` and the day's `spec.md`.
2. Pick up from the recorded "next step"; re-derive nothing that's already written down.
3. Keep `summary.md` append-only through the day so state survives compaction, a fresh
   session, or a hit token limit.

## Autonomy boundaries

- Auto-merge a PR only once **CI is green** (via the `ship` skill).
- Respect the deny-list in `.claude/settings.json` (no force-push, no `rm -rf`, no `.env`
  reads/writes). If a task seems to need one of those, that's a push-notify, not a workaround.
