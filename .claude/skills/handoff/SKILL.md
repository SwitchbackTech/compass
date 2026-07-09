---
name: handoff
description: Start the day's autonomous work from the morning spec. Use when the PO says "/handoff", "start the handoff", "kick off today's work", or "I finished the spec" — right after they've written the day's `handoff/<date>/spec.md`. Loads the day's spec and the workflow rules, runs the single morning clarify-and-plan gate, then implements uninterrupted (own judgment, one PR per task, auto-merge when green, push-notify blockers) while maintaining the day's summary doc.
---

# handoff

The morning kickoff for the rhythm-based PO+Agent workflow. The PO writes the day's
spec, runs `/handoff`, answers a round of questions, approves the plan, and walks away.
Everything after the plan gate runs uninterrupted.

**This skill is an orchestrator — it does not restate the rules.** The source of truth is
`handoff/HANDOFF.md` (the rhythm) and `handoff/agent-operating-rules.md` (self-governance:
model/effort tiering, the 2-attempt spike rule, push-notify-vs-log, resume protocol). Read
both at the start of every run; if they disagree with anything here, they win.

## 0. Load the day's context

- Resolve today's date: `date +%Y%m%d` → `<date>`. The day's folder is `handoff/<date>/`.
- Read `handoff/HANDOFF.md` and `handoff/agent-operating-rules.md` in full.
- Read `handoff/<date>/spec.md`. If it's missing, don't guess — ask the PO where the spec
  is or whether to start from yesterday's PO follow-ups, then stop until they answer.
- Skim the most recent prior `handoff/<date>/summary.md` for open PO follow-ups to fold in.

## 1. The one interactive gate (clarify + plan)

This is the **only** point in the day you may ask the PO questions. Make it count.

- Review the spec for ambiguity, hidden ordering constraints, and outdated premises
  (verify assumptions against the code before planning — e.g. don't "add" what already
  exists). Use `Explore`/`Plan` subagents (Haiku for wide mechanical search) to scope.
- Ask clarifying questions with `AskUserQuestion` — batch them; don't drip one at a time.
- Write the plan to `handoff/<date>/plan.md`: per-spec-item approach, the files you'll
  touch, decisions you're making solo, and anything you're deliberately NOT doing.
- Get the PO's approval (revisions are expected). Do not start implementing until approved.

## 2. Implementation window (uninterrupted)

Per `HANDOFF.md` → Daily implementation and `agent-operating-rules.md`:

- Use your own judgment — **no mid-day questions**. Record decisions instead of asking.
- Tier model/effort to the task (Opus+high for planning/hard bugs; cheaper + lower effort
  for mechanical work). Honor the **2-attempt spike rule**: stop, checkpoint, and pivot or
  push-notify rather than grinding a failing approach.
- **One PR per spec item**, each on its own branch off `main`, with a self-contained
  description incl. Manual Testing Steps. Ship via the **`ship` skill** — it validates,
  reviews, opens the PR, watches CI, and squash-merges once green.
  - Gate merges on authoritative signals (`gh pr checks --watch` exit code +
    `mergeStateStatus == CLEAN`), never a `grep -c fail` count (grep exits non-zero on
    zero matches — a green PR would look red).
- Respect `.claude/settings.json` deny-list. Anything needing a denied action is a
  push-notify, not a workaround.
- **Blocked or need a PO-only decision:** send a mobile push notification, log it under
  the summary's PO follow-ups, and move to other workable spec items — never idle.
- QA: CI is the always-on gate. Do real-browser QA (`preview_*`, `/qa-staging`) while the
  screen is present/unlocked; sequence it for then if the PO has walked away.

## 3. Keep the summary current

Maintain `handoff/<date>/summary.md` throughout the day (append-only so it survives
compaction / a fresh session / a hit token limit) with the sections `HANDOFF.md` requires:
Executive summary · Before and after (table) · Decisions · PO follow-ups · Token spend
(the `/usage` figure).

## 4. Wind down

- When the day's spec is done (or budget runs out), record the exact next step in the
  summary so tomorrow resumes with zero re-derivation.
- Evening cleanup: run the **`simplify`** skill over the day's diffs and land the cleanup
  as its own PR(s).

## Notes

- If run mid-day (not first thing), skip to the phase that matches where the day is.
