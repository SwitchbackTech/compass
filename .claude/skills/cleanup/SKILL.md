---
name: cleanup
description: The team cleanup ritual from TEAM.md. Review everything merged to main since the last cleanup, run the `simplify` skill over those diffs, and auto-merge simplification PR(s) so the code ends up cleaner than it started — never sloppier. Also run a `qa-ux-sweep` over the merge window to catch usability/a11y friction and auto-fix it. Then log the close-out and run a `/qa-test-staging` sweep so the founder can do a final review of the living app in staging. Use when the founder says "/cleanup", "run the evening cleanup", "clean up the day's work", or "tidy up before I review staging".
---

# cleanup

The recurring quality ritual: it closes out a stretch of merged work by making
sure the code got *simpler*, not sloppier, as work piled up — then leaves the
founder with a clean staging environment to review.

**This skill is an orchestrator — it does not restate the rules.** The source of
truth is `team/TEAM.md` (the rhythm) and `team/operating-rules.md`
(self-governance). It delegates the actual work to existing skills — do not
reimplement them here:

- **`simplify`** — finds and applies the quality/legibility fixes.
- **`qa-ux-sweep`** — proactively explores the merge window for usability/a11y friction.
- **`ship`** — validates, reviews, opens the PR, watches CI, squash-merges on green.
- **`qa-test-staging`** — the post-deploy staging sweep in the user's real Chrome.

Run it after a stretch of implementation work is done. It runs unattended through
the merge, then hands the founder a staging review checklist.

## 0. Load context and find the review window

- Resolve today's date: `date +%Y-%m-%d` → `<date>`.
- Read `team/TEAM.md` and `team/operating-rules.md`. If they disagree with
  anything here, they win.
- Read any `team/<role>/notes/` entries dated within the review window for context
  on what shipped and *why* — the decisions and known warts are your map of where
  complexity likely accumulated.
- **Establish the review window (since last cleanup):**
  - `git fetch origin` then capture the tip: `END=$(git rev-parse origin/main)`.
  - Read the marker file `team/.cleanup-marker` — it holds the `main` SHA reviewed by
    the previous cleanup. That's `START`.
  - If the marker is missing (first-ever run), fall back to the last commit before
    midnight today: `START=$(git rev-list -1 --before="$(date +%Y-%m-%d)T00:00:00" origin/main)`,
    and say so in your close-out.
  - The review window is `START..END`. Inspect it: `git log --oneline START..END` and
    `git diff START..END --stat` to see everything merged since the last cleanup.
  - If the window is empty, stop and tell the founder there's nothing to clean up.

## 1. Plan the simplifications — on the best available model

This is the highest-leverage step, so it gets the **most intelligence**, overriding the
default tiering in `operating-rules.md` (which would push refactors to a cheaper
tier). Reasoning about *what could be simpler* is worth the spend; the mechanical
application afterward can drop to a cheaper model.

- Switch to the best available model at high effort for the analysis pass:
  `/model opus` (or the strongest model available) and `/effort high`.
- Read the `START..END` diff with fresh eyes and the window's note decisions in mind.
  Ask: where did the work add duplication, indirection, an unnecessary
  `useEffect`/`useRef`, a premature abstraction, or a wart a note flagged? Compass's
  north star is **simplicity** (TEAM.md → Priorities) — hunt for it deliberately.
- Sketch the cleanup targets before touching code. Group them into one or more logical
  PRs (small, reviewable, one concern each). Behavior must not change: this is
  quality-only, exactly `simplify`'s remit, not `/code-review`'s.

## 2. Apply via the `simplify` skill

For each cleanup target, on its own branch off `main`:

- Run the **`simplify`** skill scoped to the relevant files/area. Let it do the reuse,
  duplication, and legibility work using Compass conventions; you've already decided the
  targets, so point it precisely.
- Once the plan is set, the mechanical application can run on a cheaper tier per the
  operating rules — reserve the top model for judgment, not edits.
- Keep each PR to a single coherent concern. Prefer several small PRs over one sprawling
  diff if the changes are unrelated.

## 3. Ship each PR — auto-merge on green

Ship every cleanup PR via the **`ship`** skill:

- Non-draft PR, lower-case conventional-commit title (e.g. `refactor(web): …`,
  `style(core): …`), self-contained description **including Manual Testing Steps**.
- `ship` validates locally, runs its correctness review, watches CI, and
  **squash-merges once green** — same autonomy as any role session
  (`operating-rules.md` → auto-merge only on green CI, never a `grep -c fail`).
- If CI stays red after a genuine fix attempt or a change turns out to be behavior-risky,
  don't force it: leave that PR open, note it under Founder follow-ups in the close-out,
  and carry on with the rest. Own the call — never spawn a task chip
  (`operating-rules.md` → "I own follow-up decisions").

## 4. Proactive UX sweep over the window

Run the **`qa-ux-sweep`** skill scoped to the full `START..END` review window (not just
the cleanup PRs — the whole merge window, same range established in step 0). This is
the closing counterpart to the per-PR sweep role sessions run after each ship: a
second pass, with fresh eyes, over everything that shipped.

- `qa-ux-sweep` drives the changed surfaces in the browser looking for usability/a11y
  friction — confusing focus order, missing labels, unclear states — and fixes what's
  fixable through the normal `ship` flow, auto-merging on green.
- Anything it can't fix confidently (needs a product/design call) gets logged under
  Founder follow-ups, not force-fixed and not spawned as a task chip.
- If the window is UI-only complexity work with no behavior change (rare, but possible
  after step 2), `qa-ux-sweep` may find nothing — that's a valid, non-padded outcome.

## 5. Advance the marker

Once the cleanup PRs are merged, record the window you reviewed so the next run starts
fresh:

- Write `END` (the SHA captured in step 0, the tip *before* your cleanup commits) into
  `team/.cleanup-marker`. Reviewing your own cleanup output next time would be noise —
  the marker points at what the window's work reached, not your cleanup on top of it.
- Commit the marker directly to main as a tiny `chore(team): advance cleanup marker`
  commit. It lives in `team/`, which is committed but CI-ignored.

## 6. Log the close-out

Append the ritual's record to the QA daily note, `team/qa/notes/<date>.md`, under a
`## Cleanup` heading:

- What you simplified and why (one or two lines per PR, with links).
- What `qa-ux-sweep` found/fixed in step 4.
- Founder follow-ups: any cleanup PR left open for review, anything needing a call.
- The session's **token spend** (`/usage`) if not already logged.

## 7. Staging sweep, then hand off to the founder

The cleanup PRs auto-deploy to staging on merge. Before the founder reviews:

- Run the **`qa-test-staging`** skill: verify the correct signed-in staging profile,
  run the standard flows watching console/network, and exercise the Manual Testing
  Steps from the cleanup PRs (and the window's other merged PRs) to catch any
  regression the simplification or `qa-ux-sweep` fixes introduced. Requires an
  unlocked screen with the extension connected in the staging profile — if that
  precondition isn't met, say so and leave the sweep for the founder rather than
  reporting a green run you didn't do.

Then hand off with a short close-out:

- What was simplified (link the merged PRs) and the net effect (lines/indirection removed).
- What `qa-ux-sweep` found and fixed (link the merged PRs), and anything it flagged for
  the founder instead.
- The `qa-test-staging` result — green, or exactly what looked off.
- A short **"review in staging"** checklist: the specific flows the founder should click
  through to confirm the living app still works, drawn from the areas the cleanup touched.

## Guardrails

- **Quality only, with one deliberate exception.** Steps 1-3 (`simplify`) never change
  behavior. Step 4 (`qa-ux-sweep`) is the one place this ritual *does* change behavior on
  purpose — adding a missing keyboard handler or focus ring is a real, if small, behavior
  change, not a refactor. That's fine: it's still in the "simple, accessible product"
  remit from `TEAM.md` → Priorities, just not literally behavior-preserving. If you spot
  a correctness bug (not a11y/UX friction), that's `/code-review` territory — note it under
  Founder follow-ups, don't silently fix it here.
- **Nothing to do is a valid outcome.** If the window's diffs are already clean, say so and
  advance the marker. Don't manufacture churn to justify a PR.
- **Own follow-up decisions.** Incidental findings are yours to fold in or drop
  (`operating-rules.md` → "I own follow-up decisions"). Never hand the founder a
  context-free choice or a task chip.
