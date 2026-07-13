# Team Handbook

Operating doc for the Compass Calendar team: one human founder and four autonomous
agent roles. Each role has a charter defining what it owns and what it may do
without asking.

## Priorities

Things that matter most to us. If you need to make a decision, do not compromise on these things.

**Simplicity**. Everything about Compass Calendar must be simple. The code stays simple. The infra is simple to maintain. The product is simple to understand and use. Seek opportunities to simplify the code we already have. When adding new code, don't blindly accept complexity, even if it accomplishes the fix/enhancement. Instead, give it another look and try to do the work more simply.

**Quality**. As time goes on, the code gets cleaner and more maintainable. The product gets easier to use. Our design style gets more consistent.

**Accessibility**. Every component in our UI is accessible, so that users that rely on assistive devices can do everything a mouse and keyboard user can.

## The team

| Role | One-liner | Charter |
|------|-----------|---------|
| Founder (human) | Signs off on priorities, decides the roadmap, unblocks, fights complexity | [founder/charter.md](./founder/charter.md) |
| QA Engineer | Tests the app from the user's seat; regressions, logs, CI speed, accessibility | [qa/charter.md](./qa/charter.md) |
| Fullstack Engineer | Implements features and fixes bugs, simply | [fullstack/charter.md](./fullstack/charter.md) |
| Architect | Keeps the system simple at the highest level; keeps the backlog solid | [architect/charter.md](./architect/charter.md) |
| Product Owner | Turns usage metrics and user feedback into product recommendations | [product-owner/charter.md](./product-owner/charter.md) |

Charters define **standing authority**: if a piece of work is in your charter's
standing authority, do it without asking. If it's under "needs approval", propose it
first. On conflict, this file and [operating-rules.md](./operating-rules.md) win over
a charter.

## How work happens

The loop is **propose → approve → execute**, and there are two ways execute happens:

1. **Propose.** A role writes a proposal in its daily note (`## Proposals`: what, why,
   rough size, risk) or surfaces it as a `[needs approval]` priority in standup.
2. **Approve.** The founder says yes — recorded under `## Founder decisions` in the
   day's standup file, or as an `Approved by founder <date>` line appended to the
   proposal in the role's note. That markdown line **is** the authorization record;
   there is no other tracker.
3. **Execute**, one of:
   - **Standup-driven (default for anything approved during `/standup`).** The
     `standup` skill implements and lands the approved backlog itself, same turn —
     no founder launch needed. Implementation fans out in parallel across isolated
     worktrees; merges land through a **serialized queue**, one at a time, each
     rebased onto the current `main` right before merging, so agents never race
     each other for a merge or a deploy slot. See `.claude/skills/standup/SKILL.md`
     step 5.
   - **Manual launch (for proposals approved outside standup).** The founder starts
     a role session directly — "act as QA, execute the approved test-speed
     proposal." The session reads its charter, the approval record, and its latest
     notes, then splits the work into ship-sized PRs using its own judgment, shipped
     via the `ship` skill. Genuine blockers follow the push-notify rules in
     [operating-rules.md](./operating-rules.md); everything else is the role's call.

Recurring rituals:

- **Standup** (`/standup`, founder-run, any time): each agent role reviews the
  codebase/app against its charter and reports recent work, top-3 priorities, and
  blockers. Output lands in `team/standups/<date>.md` along with founder decisions,
  and every approved item is implemented and merged before the skill hands control
  back — see above.
- **Cleanup** (`/cleanup`, founder-run): reviews everything merged since the last
  cleanup, simplifies, sweeps UX, and verifies staging.

## Workflow principles

**Local planning.** Instead of tracking work in GitHub (issues, projects, PR
descriptions), we persist planning work in local markdown files in the `team/`
directory. We do not use GitHub for issues or project management.

**Local QA.** Instead of spinning up new cloud environments to test, we test using
the local browser / computer. This ensures we're testing the product like a user
would. CI is the always-on gate that runs on every PR regardless of who is at the
machine; real-browser QA (local preview, `/qa-test-staging`) happens while the
screen is present and unlocked. When an agent is working while the founder is away
with a locked screen, code, tests, CI, and git continue, and browser QA is sequenced
for when the screen is unlocked.

## Notes & visibility

Each agent role keeps concise daily notes at `team/<role>/notes/YYYY-MM-DD.md` —
only on days the role actually did something, ~30 lines max:

```markdown
# YYYY-MM-DD — <role>
## Work            (≤3 bullets, PR links)
## Decisions       (what + why — the reasoning is the point)
## Proposals       (when present: what/why/size/risk)
## Founder follow-ups   (when present)
```

Don't duplicate across roles: a shipped PR is noted once, by the role that shipped
it. No executive summaries or before/after tables — decisions and reasoning are the
payload.

Other locations:

- `team/standups/` — standup reports and the founder-decision record.
- `team/backlog/` — the shared backlog (architect maintains it; every role reads it).
- `team/archive/` — frozen history from the previous handoff workflow. Never rewrite it.

## Repo hygiene

`team/**` is committed but ignored by CI (`paths-ignore` in the test and release
workflows). Branch protection on `main` blocks direct pushes, so notes-,
standup-, and backlog-only changes still go through a PR — but a self-merged one,
same turn: branch, commit as `chore(team): …`, `gh pr create`, then
`gh pr merge --squash --admin` immediately, since a paths-ignored PR has no CI
checks to wait for anyway. Never leave one of these open for the founder to
merge. Any change that touches code goes through the normal PR flow (real CI
gate, `ship`'s green-then-merge).

## Production workflow

As needed (currently twice a week), the founder manually deploys `main` to
production.
