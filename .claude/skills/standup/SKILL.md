---
name: standup
description: Team standup for the Compass roles. Spawns the four agent roles (QA, Fullstack, Architect, Product Owner) in parallel; each reviews the codebase/app against its charter and reports 3 bullets of recent work, top-3 next priorities, and blockers. Synthesizes into team/standups/YYYY-MM-DD.md, records founder decisions, then autonomously implements and lands every approved item via a serialized-merge workflow — no further launches needed from the founder. Use when the founder says "/standup", "run standup", "team standup", or "what's the team's status".
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

## 4. Land the standup file

Branch protection on `main` blocks direct pushes, so this is a self-contained
branch → PR → merge, not a bare commit:

- `git checkout -b claude/standup-<today>`, commit the file:
  `chore(team): standup <today>`.
- `git push -u origin HEAD`, `gh pr create --base main --title "chore(team): standup <today>" --body "..."`.
- `gh pr merge <n> --squash --admin` immediately — `team/**` is path-ignored by
  CI, so there is nothing to wait for. Do this yourself, in this same turn;
  never leave it as an open PR for the founder to notice and merge later.

## 5. Auto-execute the approved items

If step 3 produced any `APPROVED` items, don't stop and hand the founder a
list of sessions to launch — execute them now, in this same turn, via the
`Workflow` tool. (This skill's own instructions are the opt-in: invoking
`Workflow` here is expected, not a judgment call to re-litigate.) Read-only
research already happened per-role in step 1; this phase implements.

**Why a workflow and not just parallel `Agent` calls:** the failure modes
you're fixing — agents fighting over merges/deploys, agents drifting behind a
`main` that moved while they worked — both come from treating *merge* as
parallelizable when it isn't. Implementation can fan out safely (isolated
worktrees don't collide). Merge cannot: it's a single shared resource
(`main`), so it must be a queue of one, not a fan-out. `Workflow`'s
`pipeline()` gives you exactly that shape — independent parallel stages with a
serialized final stage — for free.

Split `APPROVED` items into two kinds:

- **Notes/backlog-only** (no code — e.g. an architect backlog edit, a PO
  write-up): handle these directly, same pattern as step 4 (branch → PR →
  `--squash --admin`, no CI wait). Do them one at a time in this main session;
  they're small enough that a full workflow is overkill.
- **Code work**: run through `Workflow`, one queue item per approved proposal,
  each tagged with its owning role. Shape:

```js
export const meta = {
  name: 'standup-execute',
  description: 'Implement and land the standup-approved backlog',
  phases: [{ title: 'Implement' }, { title: 'Merge' }],
}

// Merge is a queue of one — chain onto this promise, never parallel().
let mergeChain = Promise.resolve()
function serialized(fn) {
  const result = mergeChain.then(fn, fn)
  mergeChain = result.catch(() => null)
  return result
}

const results = await pipeline(
  approvedCodeItems,
  item => agent(
    `Act as ${item.role}. Implement the approved proposal: ${item.summary}. ` +
    `Read team/${item.role}/charter.md and team/operating-rules.md first. ` +
    `Branch off current origin/main. Implement, then run the \`ship\` skill ` +
    `through PR creation and green CI — but STOP before merging. Return the ` +
    `PR number and branch name.`,
    { phase: 'Implement', isolation: 'worktree', label: item.role }
  ),
  (impl, item) => serialized(() =>
    agent(
      `A PR is ready to merge: #${impl.prNumber} (${impl.branch}), for the ` +
      `approved "${item.summary}" proposal. git fetch origin, rebase this ` +
      `branch onto the current origin/main tip (main may have moved since ` +
      `this PR was opened — that's expected, this is a serialized merge ` +
      `queue), push, confirm CI is still green, then ` +
      `\`gh pr merge --squash --admin\`. If the rebase has a real conflict ` +
      `(not trivial), stop and report it rather than guessing at a resolution. ` +
      `Then append a Work bullet with the PR link to ` +
      `team/${item.role}/notes/<today>.md (create it if this is the role's ` +
      `first entry today) — you're merging on the role's behalf, so the note ` +
      `is your responsibility, not theirs.`,
      { phase: 'Merge', label: item.role }
    )
  )
)
return results
```

- Each `Implement` agent starts from **whatever `main` looks like when it
  spins up** — fine, because it never merges directly; the `Merge` stage
  re-fetches and rebases immediately before landing, so the gap between
  "branched from" and "merged onto" main is always small even when several
  items are queued.
- A merge failure (real conflict, CI regression after rebase) is a
  **push-notify**, not a silent drop — surface it in the final summary (step
  6) rather than letting the item vanish from the queue.
- Cap what you auto-execute per run to what's actually reasonable to land in
  one sitting — if `APPROVED` has many items, say so and ask the founder
  whether to run the full batch or a subset, rather than silently queuing
  everything.

## 6. Report back

Once the workflow (if any) completes, post a short summary in chat: what
merged (PR links), what's still open/blocked and why, and where notes/backlog
updates landed. This is the only round-trip back to the founder after the
step-3 approval — no further launches needed.

## Guardrails

- Reports reflect what the repo/notes actually show — no padded bullets, no
  invented metrics. "Nothing this window" is a valid recent-work bullet.
- Priorities must trace to the charter, the backlog, or an observed problem; a
  priority that needs new scope gets `[needs approval]`, not silent adoption.
- Step 1 (research/reporting) stays read-only — no implementation before the
  founder approves. Everything after approval (steps 4-6) is this skill's job
  to drive to completion; it doesn't hand off half-finished work.
- Never parallelize the merge stage. If you find yourself reaching for
  `parallel()` around a `gh pr merge`, stop — that's the exact bug this
  redesign exists to fix.
