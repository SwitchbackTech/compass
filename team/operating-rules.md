# Operating rules

Self-governance for autonomous role sessions. This is what every agent role consults
to make decisions consistently when the founder is not watching. It complements
[TEAM.md](./TEAM.md); read that first for the overall rhythm, and your role's
charter for what you own.

## Model & effort tiering (Max 5x — spend deliberately)

Match the model and reasoning effort to the work. Do not run Opus + high on everything.

| Work | Model | Effort |
|------|-------|--------|
| Planning, architecture, gnarly bug diagnosis | Opus | high / xhigh |
| Routine implementation, refactors, writing tests | Sonnet | medium |
| Mechanical edits, subagent fan-out, grepping docs/logs | Haiku (subagents) | low |

- Switch live with `/model` and `/effort`; set the session's default with `--model` at launch.
- Delegate wide, mechanical search to Haiku subagents (`model` option on the Agent tool)
  so the main context stays cheap and focused.
- Reach for xhigh/max only when a problem is genuinely hard — not as a default.

## Spike-budget rule (don't burn tokens on a wall)

- If an approach isn't working after **~2 genuine attempts**, stop. Do not keep grinding.
- Checkpoint (`Esc Esc` to rewind cheaply), write the dead-end + current hypothesis into
  your role's daily note, then either pivot to a different approach or move to another task.
- Prefer plan mode before non-trivial work so wrong directions cost reads, not rewrites.
- Run risky experiments in a subagent or a throwaway worktree so a failed spike doesn't
  pollute or cost the main context.

## Checkpoint at clean boundaries

- Compact or start a fresh session at task boundaries, never mid-refactor.
- All resumable state lives in your role's daily note (`team/<role>/notes/<date>.md`) —
  keep it current enough that a fresh session (or tomorrow) can resume with zero
  re-derivation.
- Self-monitor with `/context` and `/usage`; log the session's token figure in the note.

## When to push-notify vs. log-and-continue

**Push-notify the founder** when I am truly blocked:

- A decision only the founder can make (product direction, ambiguous scope, external access).
- A destructive or irreversible action I'm unwilling to take autonomously.
- Weekly token limit hit — checkpoint, notify, and record the next step.

**Log under Founder follow-ups and keep working** when:

- The blocker only affects one task and other approved work is still workable.
- It's a nice-to-have observation or a question that can wait for the next standup.

Never idle waiting for an answer if there is other useful approved work.

## I own follow-up decisions — never hand the founder a context-free choice

Incidental issues I discover mid-work (a stray warning, dead code, a tangential
cleanup, a possible edge case) are **mine to decide**, not the founder's. I have the
full context; the founder does not.

- **Never spawn a background task chip (`spawn_task`) during any autonomous role
  session**, and don't otherwise manufacture a decision point for the founder. A chip
  offloads a judgment call onto someone with none of the context — the opposite of
  owning the work.
- Decide it myself: worth doing and reasonable in scope → do it (fold in or its own
  PR); a distinct larger effort not worth doing now → drop it, or record it **once**
  in my daily note as a proposal or backlog recommendation (an async FYI, not a
  decision I'm offloading).
- Reserve push-notify and Founder follow-ups for things that **genuinely require the
  founder** — product direction, ambiguous scope, external access — not code-quality
  or scope calls I'm equipped to make.

## Resume protocol

1. On starting a session, read your role's charter, the latest `team/standups/` file,
   and your latest `team/<role>/notes/` entry.
2. Pick up from the recorded next step; re-derive nothing that's already written down.
3. Keep the daily note append-only through the day so state survives compaction, a
   fresh session, or a hit token limit.

## Autonomy boundaries

- Auto-merge a PR only once **CI is green** (via the `ship` skill).
- Notes-, standup-, and backlog-only changes still go through a PR (branch
  protection blocks direct pushes) but merge it yourself, same turn —
  `gh pr merge --squash --admin` immediately after `gh pr create`, since CI
  ignores `team/**` and there's nothing to wait for. Never leave one of these
  open for the founder to merge.
- Respect the deny-list in `.claude/settings.json` (no force-push, no `rm -rf`, no `.env`
  reads/writes). If a task seems to need one of those, that's a push-notify, not a workaround.

## Merging is a queue of one — never parallelize it

Implementation can safely run in parallel (isolated worktrees don't collide).
Merging onto `main` cannot — it's a single shared resource, and treating it as
parallelizable is what produces PRs racing each other for a merge or a deploy
slot (a CI-level concurrency queue on the deploy job stops two deploys from
overlapping, but that doesn't stop two branches from conflicting with each
other or with a `main` that moved mid-flight).

- If several PRs are ready around the same time — during standup's
  auto-execution (`.claude/skills/standup/SKILL.md` step 5) or otherwise —
  merge them **one at a time**, and re-fetch/rebase each onto the current
  `origin/main` tip immediately before its merge, not at whatever point it was
  branched.
- When merging on behalf of a role you're not currently acting as (e.g. the
  standup orchestrator merging a fullstack PR), append the Work bullet to that
  role's `team/<role>/notes/<date>.md` yourself — the note is the merger's
  responsibility, not something to leave for a session that never runs.
- A merge that hits a real conflict (not a trivial rebase) is a push-notify,
  not something to force through — report it and keep the rest of the queue
  moving.
