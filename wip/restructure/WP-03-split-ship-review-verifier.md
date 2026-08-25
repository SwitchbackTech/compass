# WP-03 — Split `/ship`; add Reviewer and Verifier contracts

**task_id:** WP-03
**status:** verifying
**owner:** cursor-agent
**depends on:** WP-02 `done` (typed handoff must exist)
**next owner after done:** WP-05, then WP-06; fill delivery-loop baseline in
`TRACKING.md`

## Why

`/ship` owns routing, implementation validation, simplify invocation,
independent review, PR, merge, and release watch. That is a Manager that
also does every specialist job. Playbook: if the Manager repeatedly
performs a specialist’s job, the role boundary is wrong.

Independent review is a `/ship` gate with no skill. `/verify-change` still
allows the same agent to “fix” as it verifies. Producer and verifier must
separate.

## Finish line

1. `/ship` is a **Manager** skill: preflight, route, wait on artifacts,
   request evidence, advance/retry/escalate, open/merge PR only after
   specialist verdicts. It does not re-implement simplify, review, or
   verify steps inline except to invoke those skills.
2. `/review` exists as a **read-only** skill. It takes worktree, base ref,
   task intent, `AGENTS.md`, and the complete diff **without** the
   implementation agent’s conclusions. It returns confirmed findings
   (severity, path/line, impact, evidence) or “no confirmed findings.”
   It must not edit production code in the same turn.
3. `/verify-change` returns a binary `PASS | RETRY | ESCALATE` plus
   enumerated failures and evidence pointers. It must not repair the
   artifact. Retryable vs not is explicit.
4. Role cards from [`00-gap-and-model.md`](00-gap-and-model.md) are
   copied into the relevant skill frontmatter/body (Manager, Implementer
   note, Verifier, Reviewer). `/simplify` stays as-is except a note that
   `/ship` invokes it rather than inlining detectors.
5. `/ship` writes/updates `.agents/ledger.md` and a typed handoff at each
   gate (validate → review → simplify → verify → PR).
6. Deterministic routing table from `00-gap-and-model.md` is in `/ship`.
7. Concurrency budget stated: max 3–4 specialists; fan-out only after a
   frozen core contract.

## Skill split (do not create extra Bots)

| Skill | Role | Edits code? |
| --- | --- | --- |
| `/ship` | Manager | Only to fix confirmed review/verifier failures *after* routing back to Implementer behavior — prefer instructing the implementer session; if this is still one session, isolate fix commits |
| `/verify-change` | Verifier | No |
| `/review` | Reviewer | No |
| `/simplify` | Simplifier | Yes, behavior-preserving only |
| `/local-dev-bootstrap` | Bootstrap | Config/env only |
| `/chaos` | Exploratory QA then hand off to Manager | Yes today; this WP only adds “hand off via schema, do not skip `/review`” — do not fully rewrite chaos |

One session may still play multiple roles **in sequence** (Compass does not
have a Bot runtime). The skill files must make the role switch explicit:
“you are now the Verifier; do not edit.” That is enough until a later
Routine launches separate agents.

## Steps

1. Read [`.agents/skills/ship/SKILL.md`](../../.agents/skills/ship/SKILL.md),
   [`.agents/skills/verify-change/SKILL.md`](../../.agents/skills/verify-change/SKILL.md),
   [`.agents/skills/simplify/SKILL.md`](../../.agents/skills/simplify/SKILL.md),
   [`.agents/handoffs/SCHEMA.md`](../../.agents/handoffs/SCHEMA.md).
2. Rewrite `/ship` around gates that **invoke** other skills by name.
   Keep existing guardrails (stop on `main`, no force-push, no weaken
   tests, pause on product ambiguity).
3. Add `.agents/skills/review/SKILL.md` with frontmatter `name: review`,
   description that triggers on “independent review”, `/ship` gate, or
   “review this diff.” Include anti-patterns: no drive-by refactors, no
   implementing fixes, no approving without reading the full diff.
4. Upgrade `/verify-change` report to:

   ```text
   VERDICT: PASS | RETRY | ESCALATE
   FAILURES:
   - id: …
     retryable: true|false
     evidence: …
   CHECKS_RUN: …
   CHECKS_SKIPPED: … (reason)
   ```

   Keep the package decision table. Require `bun run verify` output to be
   quoted (WP-01 makes that output trustworthy).
5. Update `AGENTS.md` Skills list: add `/review`; describe `/ship` as
   Manager. (Full registry versioning is WP-05; this WP only fixes the
   index so `/review` is discoverable.)
6. Update `.github/PULL_REQUEST_TEMPLATE.md` Independent review section
   to require the `/review` verdict pointer (path to handoff or quoted
   findings). Do not add checkboxes.
7. After merge of this WP, run three real or recorded dry-run ships and
   fill the baseline table in `TRACKING.md` (manual baseline). If no real
   product change is in flight, dry-run against this pack’s own PR is
   acceptable for run 1.

## Acceptance tests

- **Normal:** an agent given only `/ship` on a green branch invokes
  verify → simplify → review in that contract; PR template can be filled
  from those artifacts.
- **Incomplete:** `/review` given no diff stops and asks; does not invent
  findings.
- **Verifier independence:** `/verify-change` on a failing test returns
  `RETRY` or `ESCALATE` with the command output; the skill text forbids
  editing tests to go green.
- **Policy:** `/review` frontmatter/body forbids production edits.
- **Manager health:** `/ship` states that two specialists must not own the
  same task; waiting names dependency + check time.

## Evidence

```text
ship skill now invokes: verify-change, simplify, review
review skill path: .agents/skills/review/SKILL.md
verify-change verdict format present: yes
AGENTS.md index updated: yes
PR template Independent review requires pointer: yes
baseline table rows filled: 3 (dry-run of this pack’s PRs; merge still 403)
```

## Out of scope

- Skill version frontmatter for every skill (WP-05)
- Autofix Routine contract (WP-06)
- Hard CI for empty PR template (WP-04)
- Parallel multi-agent runtime
- Chaos rewrite beyond a handoff sentence

## Anti-patterns

- Adding Inbox/Calendar/Product Bots
- Leaving `/ship` as a copy-paste of the old steps “plus invoke skills”
  without deleting the inlined specialist procedures
- A reviewer skill that “may apply trivial fixes”

## Handoff

```yaml
task_id: WP-03
from:
to: Implementer
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-03 from wip/restructure/WP-03-split-ship-review-verifier.md.
Read README.md, TRACKING.md, 00-gap-and-model.md role cards, and
.agents/handoffs/SCHEMA.md. Mark WP-03 running. WP-02 must already be done.

Finish line: /ship is a Manager that invokes /verify-change, /simplify, and
new read-only /review; /verify-change returns PASS|RETRY|ESCALATE and must
not edit; AGENTS.md lists /review; PR template Independent review requires
a pointer. Do not version every skill (WP-05). Commit. Update TRACKING.md
and Evidence. Fill baseline rows if you can dry-run /ship on this branch.
```
