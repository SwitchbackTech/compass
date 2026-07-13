---
name: standup
description: Team standup for the Compass roles. Spawns the four agent roles (QA, Fullstack, Architect, Product Owner) in parallel; each reviews the codebase/app against its charter and reports 3 bullets of recent work, top-3 next priorities, and blockers. Synthesizes into team/standups/YYYY-MM-DD.md and records founder decisions. Use when the founder says "/standup", "run standup", "team standup", or "what's the team's status".
---

# standup

A founder-run sync, any time of day. Each agent role reviews the codebase/app in
light of its charter and reports. The output file doubles as the **founder-decision
record**: approvals recorded here are the authorization a later role session cites.

Source of truth for roles and rhythm: `team/TEAM.md`, `team/operating-rules.md`,
and the four charters in `team/<role>/charter.md`.

## 0. Establish the window and gather shared context once

Do this in the main session so the four role agents don't each repeat it:

- `date +%F` → `<today>`.
- Last standup = the newest file in `team/standups/` (by filename). If none exists,
  use a 7-day window.
- `git fetch origin`, then collect:
  - `git log --oneline --since=<last-standup-date> origin/main` — what merged.
  - `git diff --stat <first-commit-in-window>^..origin/main` (or per-PR stats) — where it landed.
  - `gh run list --branch main --limit 10` — CI health and durations.
  - `gh pr list --state open` — anything in flight.
  - The header/status section of `team/backlog/master-doc.md` — where the roadmap stands.
- If the founder pasted metrics or user feedback into the invocation, hold it for the
  product-owner agent.

## 1. Spawn the four roles in parallel

Launch four `general-purpose` agents **in a single message** (one per role: qa,
fullstack, architect, product-owner). Standup reporting is routine — run them on a
mid-tier model per `team/operating-rules.md`.

Each prompt must include:

1. Paths to read first: `team/<role>/charter.md`, `team/TEAM.md`,
   `team/operating-rules.md`, and its own `team/<role>/notes/` directory (may be
   empty — that's fine).
2. The shared snapshot from step 0, pasted in (don't make agents re-fetch).
3. Role-specific extras:
   - **qa**: recent CI run durations (flag any single step over 1 minute, e2e
     excluded); note that staging/prod log review may need founder-provided access —
     report it as a blocker rather than guessing.
   - **architect**: the window's diff-stat, for drift review against agreed patterns.
   - **product-owner**: whatever metrics/feedback the founder supplied (if none:
     say so under Blockers rather than inventing signal).
4. That the agent is **read-only**: explore the repo and its notes, but write no
   files — only the orchestrator writes.
5. The exact required reply format:

```markdown
### Recent work
- (exactly 3 bullets — the window's work most relevant to this role)
### Top 3 priorities
1. … (mark any item that exceeds standing authority with **[needs approval]**)
### Blockers
- … (or "None")
```

## 2. Synthesize

Write `team/standups/<today>.md` (create the directory on first run):

- Header: date, window (`<last-standup>..<today>`), one-line CI/main status.
- The four role reports **verbatim**, one `## <Role>` section each.
- `## Needs founder` — deduped blockers plus every `[needs approval]` priority,
  each phrased as a yes/no question with a one-line why.

## 3. Founder decisions

Present the `Needs founder` items in chat — use `AskUserQuestion`, batched. Append
the outcomes to the same file:

```markdown
## Founder decisions (<today>)
- APPROVED: <role>: <proposal one-liner>
- DEFERRED: <role>: <item> — <reason>
- REJECTED: <role>: <item> — <reason>
```

If the founder is running standup read-only (says "just show me status"), skip the
questions and leave `## Needs founder` unanswered — a later session can pick it up.

## 4. Commit and hand off

- Commit the standup file **directly to main**: `chore(team): standup <today>`.
  It's `team/**`-only, so CI ignores it — never open a notes-only PR
  (`team/TEAM.md` → Repo hygiene).
- Close by listing the approved items as ready-to-launch role sessions, e.g.
  "act as fullstack: execute the approved <X> proposal" — the founder launches
  them when ready.

## Guardrails

- Reports reflect what the repo/notes actually show — no padded bullets, no
  invented metrics. "Nothing this window" is a valid recent-work bullet.
- Priorities must trace to the charter, the backlog, or an observed problem; a
  priority that needs new scope gets `[needs approval]`, not silent adoption.
- This skill never starts implementation work itself. It reports, records
  decisions, and stops.
