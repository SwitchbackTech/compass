# WP-02 — Typed handoff and Manager ledger

**task_id:** WP-02
**status:** verifying
**owner:** cursor-agent
**depends on:** none (may overlap WP-01; different files)
**next owner after done:** WP-03, WP-06, WP-07

## Why

Playbook: pass artifacts and contracts, not entire conversations. Today
[`.agents/skills/handoff/SKILL.md`](../../.agents/skills/handoff/SKILL.md)
writes markdown to the OS temp directory. There is no `task_id`, owner,
status, evidence, or deadline. The human (or the next chat) is the memory
layer.

## Finish line

1. A versioned handoff schema exists at
   [`.agents/handoffs/SCHEMA.md`](../../.agents/handoffs/SCHEMA.md)
   (or `.agents/handoffs/schema.yaml` plus a short markdown spec).
2. `/handoff` writes `.agents/handoffs/<task_id>.md` in the workspace, not
   OS temp. It refuses to write if required fields are missing.
3. A compact in-repo ledger lives at
   [`.agents/ledger.md`](../../.agents/ledger.md) with one row per in-flight
   agent task. GitHub remains the human inbox; the ledger is what the
   Manager reads first.
4. `.gitignore` does **not** ignore `.agents/handoffs/` or the ledger —
   in-flight state must survive sessions. Handoffs for merged/done work are
   deleted in the same commit that closes the task (or moved to a `done/`
   folder that is gitignored if they contain logs; prefer deleting).
5. A receiver can act from the handoff file without the producer transcript.
6. Statements such as “done” or “looks good” are listed as invalid
   completions in the schema. Status only advances when `artifact` and
   `evidence` are pointers that exist.

## Required handoff fields

```yaml
schema_version: 1
task_id: "issue-1234"          # GitHub issue, PR number, or WP-*
from: Implementer
to: Verifier
owner: Verifier                # exactly one current owner
status: verifying              # queued|running|waiting|verifying|done|escalated
artifact:                      # what is ready
  - path: packages/web/src/...
  - url: https://github.com/org/repo/pull/N
evidence:                      # how to check
  - command: bun run test:web
    result: pass
    log: path-or-excerpt
assumptions:
  - "anonymous IndexedDB mode is enough"
open_risks:
  - "SSE pair not exercised"
next_deadline: 2026-08-26T18:00:00Z
retry: 0
approval: none                 # none|ask|human
waiting_on: null               # dependency name if status=waiting
escalation: null               # packet if status=escalated
```

Separate fact, decision, evidence, and artifact. Do not collapse into one
summary paragraph. Additive fields later are OK; renaming meanings is not.
Unknown `schema_version` → receiver rejects the handoff and the Manager
keeps the producer artifact.

## Ledger row

Match `wip/restructure/TRACKING.md`: task_id, priority, owner, status,
artifact, evidence, next_deadline, retry, approval. One table. No
transcripts.

When WP-07 lands, `task_id` should be the GitHub issue or PR number. Until
then, WP ids and branch names are allowed.

## Steps

1. Add `.agents/handoffs/SCHEMA.md` with the fields above, valid status
   enum, rejection rules, and a filled example plus a malformed example.
2. Rewrite `.agents/skills/handoff/SKILL.md`:
   - activation unchanged
   - write `.agents/handoffs/<task_id>.md` with YAML frontmatter matching
     the schema, then a short body for context that is *not* required to
     act
   - redact secrets (same as today)
   - do not duplicate PRDs; link them
   - refuse if `task_id`, `owner`, `status`, `artifact`, or `evidence` is
     missing
   - update `.agents/ledger.md` (create if absent) in the same turn
3. Seed `.agents/ledger.md` with a header that says “delete rows when
   status is done/escalated-and-closed; GitHub is the human inbox.”
4. Point `/ship`, `/chaos`, and `.github/prompts/error-autofix.md` at the
   schema in one sentence each (“at handoff boundaries, write a typed
   record per `.agents/handoffs/SCHEMA.md`”). Do not rewrite those skills
   in this WP (that is WP-03 / WP-06).
5. Add `.agents/handoffs/README.md` (not a barrel of code — a usage note)
   so agents find the directory.
6. Do not commit live task secrets. Example files may use `issue-0`.

## Acceptance tests

- **Normal:** running `/handoff` with a described next focus produces a
  schema-valid file and a ledger row; a second agent given only that file
  can name owner, artifact, and next check.
- **Incomplete:** missing `evidence` → skill instructs the agent to stop
  and request the field; no file written (or file written with
  `status: waiting` and `waiting_on: evidence` — pick one and document it;
  prefer refuse-to-advance).
- **Tool failure:** if the workspace is not writable, escalate; do not
  fall back to OS temp (that is the bug we are removing).
- **Policy:** secrets in the conversation are redacted in the file.
- **Handoff quality:** receiver does not need the producer transcript.

There is no unit test runner for skills. Acceptance is: schema file exists,
skill text is executable, and a dry-run in the implementing session writes
an `issue-0` example then deletes it (or leaves only the documented
example).

## Evidence

```text
schema path: .agents/handoffs/SCHEMA.md
handoff skill diff summary: writes .agents/handoffs/<task_id>.md with YAML
  frontmatter; refuses missing task_id/owner/status/artifact/evidence; never
  OS temp; updates .agents/ledger.md; redacts secrets
ledger path: .agents/ledger.md
dry-run file created and removed: yes
ship/chaos/autofix one-line pointers: yes
git check-ignore: .agents/handoffs/ and ledger are not ignored
receiver from issue-0.md only: owner=Verifier,
  artifact=.agents/handoffs/SCHEMA.md,
  next check=test -f .agents/handoffs/SCHEMA.md
```

## Out of scope

- Splitting `/ship` (WP-03)
- Issue templates (WP-07)
- Cursor Automations
- A database or app for the ledger
- Keeping OS-temp as a fallback

## Capability budget

Handoffs and ledger are internal artifacts (Allow). They must not include
`compass.yaml` contents, tokens, or personal calendar data.

## Handoff

```yaml
task_id: WP-02
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
You are implementing WP-02 from wip/restructure/WP-02-typed-handoff-ledger.md.
Read wip/restructure/README.md and TRACKING.md. Mark WP-02 running.

Finish line: versioned handoff schema in .agents/handoffs/, /handoff writes
in-repo (not OS temp) and refuses missing required fields, .agents/ledger.md
exists, ship/chaos/autofix point at the schema in one sentence each. Dry-run
an issue-0 handoff and delete it if it is not the documented example. Commit.
Update TRACKING.md and this WP's Evidence. Do not split /ship in this WP.
```
