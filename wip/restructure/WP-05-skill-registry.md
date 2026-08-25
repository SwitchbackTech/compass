# WP-05 — Skill registry, versioning, and eval stubs

**task_id:** WP-05
**status:** verifying
**owner:** Implementer (agents docs)
**depends on:** WP-03 `done` (`/review` exists; `/ship` is Manager)
**next owner after done:** WP-08 gate review; WP-06 may already be in flight
if WP-02/03 were done

## Why

Skills are durable methods. Today they have `name` and `description`, no
version, no owner, no last verified run, no eval set, no shared
anti-pattern catalog. Failures get longer chat reminders instead of a
patched Skill. Chaos exists on disk and is missing from `AGENTS.md`.

Playbook: version like software; evaluate before sharing; keep prior
version available; instructions must be executable.

## Finish line

1. Every skill under `.agents/skills/*/SKILL.md` has frontmatter:

   ```yaml
   name: …
   version: 1
   owner: compass-maintainers
   last_verified: YYYY-MM-DD
   description: …   # keep existing activation language
   ```

   Optional: `paths`, `disable-model-invocation`, `argument-hint` as today.

2. Each skill has explicit sections (short): **When**, **Steps**,
   **Output**, **Pass**, **Anti-patterns**, **Escalate**. If a skill
   already has equivalent structure, map rather than duplicate. No
   motivational language (“be thorough”).

3. [`AGENTS.md`](../../AGENTS.md) Skills list includes **chaos** and
   **review**, one line each, matching on-disk names. Thin AGENTS.md:
   constitution, command table, skill index, Cloud/bootstrap pointers.
   Move any procedure that is already in a skill out of AGENTS.md (do not
   delete Cloud-specific instructions; those stay).

4. `.agents/skills/README.md` is the registry: table of name, version,
   owner, role (Manager / specialist / verifier), last_verified. Not a
   JS/TS barrel.

5. Eval stubs at `.agents/skills/_evals/README.md` plus one markdown
   case per required class:

   | Case | What it proves |
   | --- | --- |
   | normal | known-correct artifact for `/verify-change` or `/ship` routing |
   | incomplete | missing access or empty diff must clarify, not invent |
   | tool-fail | verify/command failure preserves progress; no silent “all passed” |
   | policy | login-without-backend, denied autofix path, or force-push must stop |

   These are **stubs** (inputs + expected stop/output), not a full eval
   harness. A later session may automate them; this WP does not build a
   runner.

6. Rollback path: changing a skill bumps `version` and adds a one-line
   change note in the registry. Keep the previous skill body in `git`
   (do not copy v1 files unless a change is risky enough to warrant
   `SKILL.v1.md` beside it). Document that revert = git revert.

## Steps

1. Inventory `.agents/skills/` (ship, simplify, a11y-audit,
   qa-test-staging, verify-change, local-dev-bootstrap,
   google-sync-debug, handoff, chaos, review).
2. Add frontmatter fields without breaking existing `name`/`description`
   activation.
3. Index chaos and review in `AGENTS.md`. Trim duplicated command/policy
   prose only where a skill is now the owner — do not gut Cloud bootstrap.
4. Write the registry README and eval stubs. Point each stub at a real
   command or skill name.
5. Add anti-patterns that are currently scattered (no force-push, no
   weaken tests, no OS-temp handoff, no verifier edits, no login without
   backend) as a shared list in `.agents/skills/_evals/anti-patterns.md`
   and link it from the registry. Do not fork a second AGENTS.md.
6. `last_verified` for this WP may be the implementation date; do not
   fake production runs.

## Acceptance tests

- **Normal:** an agent reading only `AGENTS.md` finds chaos and review.
- **Incomplete:** a skill invoked with empty input hits a documented
  clarify/stop (eval stub).
- **Tool-fail:** eval stub says `/verify-change` must not print PASS on
  failed `bun run verify`.
- **Policy:** eval stub for force-push / denied path / login-without-setup
  expects stop.
- **Registry:** table rows match directories on disk 1:1.

## Evidence

```text
skills versioned (count): 10
AGENTS.md skill list: ship, review, simplify, a11y-audit, qa-test-staging,
  verify-change, local-dev-bootstrap, google-sync-debug, handoff, chaos
registry path: .agents/skills/README.md
eval stub paths: .agents/skills/_evals/{README,normal,incomplete,tool-fail,policy,anti-patterns}.md
AGENTS.md line count before/after: 168 / 167 (registry pointer replaced intro)
```

## Out of scope

- Building an automated eval runner
- Cursor Automations
- Rewriting skill bodies for style
- Personal-ops skills

## Skill vs memory

Durable rules → skills and CI. Task facts → `.agents/ledger.md`. Do not
add “remember that we always …” to AGENTS.md in this WP.

## Handoff

```yaml
task_id: WP-05
from: Implementer
to: Verifier
status: verifying
artifact: .agents/skills/README.md
evidence: 10 skills versioned; eval stubs; registry 1:1 with directories
assumptions: last_verified is implementation date, not a production eval
open_risks: WP-07 still open and also edits /ship
next_deadline: after CI
```

## Session prompt

```text
You are implementing WP-05 from wip/restructure/WP-05-skill-registry.md.
Read README.md and TRACKING.md. WP-03 must be done so /review exists.
Mark WP-05 running.

Finish line: every skill has version/owner/last_verified; AGENTS.md lists
chaos and review and stays a constitution+index; .agents/skills/README.md
registry; eval stubs for normal/incomplete/tool-fail/policy; shared
anti-patterns file. Do not build an eval runner. Commit. Update TRACKING.md
and Evidence.
```
