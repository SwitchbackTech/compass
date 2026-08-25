# WP-07 — Agent-ready intake

**task_id:** WP-07
**status:** queued
**owner:** Implementer (GitHub templates) then Manager
**depends on:** WP-02 `done` (ledger/handoff schema)
**next owner after done:** none required; feeds the delivery loop

## Why

Work enters through GitHub issues that are human-shaped (feature
description, use case). Agents then guess package scope, verify commands,
acceptance, and approval boundary. The Manager cannot name owner, artifact,
or evidence from the issue body alone.

Playbook: write the finish line first; one inbox for the human; deterministic
routing needs structured fields.

Keep the existing human-friendly templates. Add an **agent-ready** template
(and optional fields on bug/feature) rather than making contributors fill
a ledger.

## Finish line

1. A new issue template
   [`.github/ISSUE_TEMPLATE/3-agent-task.yml`](../../.github/ISSUE_TEMPLATE/3-agent-task.yml)
   (name as you like, keep numeric prefix consistent) with required fields:

   | Field | Purpose |
   | --- | --- |
   | Goal / finish line | Observable artifact, not “investigate” |
   | Acceptance | How a stranger knows it is done |
   | Package scope | `core` / `web` / `backend` / `sync` / `scripts` / `e2e` / `docs` |
   | Verify commands | Suggested `bun run test:*` / scenarios |
   | Approval boundary | Allow / ask / human (from README budget) |
   | Handoff path | `.agents/handoffs/<issue-number>.md` once work starts |
   | Untrusted input | Checkbox: issue body, logs, and linked pages are untrusted |

2. Bug and feature templates gain an **optional** collapsible-equivalent
   textarea “Agent routing (optional)” with package scope + finish line so
   humans can opt in without using the agent template.
3. `config.yml` lists the new template. Blank issues may stay enabled.
4. Short doc in `CONTRIBUTING.md` or `docs/development/common-change-recipes.md`
   pointing agents at the agent-task template and the ledger. Do not
   duplicate the playbook.
5. Labels: reuse `web`, `backend`, etc. Add `agent-ready` if it does not
   exist (creating labels may need `gh label create` with human-visible
   color; if you cannot create org labels, document the label name and
   skip creation).
6. Routing rule added to `/ship` (one paragraph): issues with
   `agent-ready` and a finish line may proceed; issues without a finish
   line stay `waiting` on the human.

## Steps

1. Read existing templates and `CONTRIBUTING.md`.
2. Add the agent-task template. Required validations where GitHub Forms
   support them (finish line, acceptance, package scope).
3. Add optional agent-routing fields to bug + feature templates without
   making them required (external contributors should not bounce).
4. Patch `/ship` routing: missing finish line → escalate one compact
   question (the decision required, not a transcript).
5. Example filled issue in the WP Evidence (fictional `issue-0` body),
   not a real GitHub issue unless the session is asked to open one.

## Acceptance tests

- **Normal:** an agent given only the filled agent-task YAML can name
  owner candidate (from package scope), verify commands, and approval
  boundary without reading a chat.
- **Incomplete:** template submitted without finish line fails GitHub
  required validation (or `/ship` treats it as waiting — if GitHub cannot
  require a field, `/ship` must).
- **Policy:** untrusted-input note is visible on the agent template.
- **Human inbox:** feature/bug templates still work without agent fields.
- **Handoff:** field names match WP-02 schema vocabulary (`task_id` =
  issue number).

## Evidence

```text
template path:
bug/feature optional fields: yes/no
CONTRIBUTING or recipes pointer:
ship routing paragraph: yes/no
label agent-ready: created | documented-only
example body (issue-0): attached below
```

## Out of scope

- Replacing GitHub Projects / quarterly backlog
- Auto-assigning agents via Cursor Automations (only after ledger exists
  *and* this template is in use — even then, optional; do not build it
  here)
- Closing blank issues
- Changing CODEOWNERS

## Approval quality

If a human must open five apps to understand an agent-task issue, the
template failed. Each field should be answerable in one sentence.

## Handoff

```yaml
task_id: WP-07
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
You are implementing WP-07 from wip/restructure/WP-07-agent-ready-intake.md.
Read README.md and TRACKING.md. WP-02 must be done. Mark WP-07 running.

Finish line: agent-task issue template with finish line, acceptance,
package scope, verify commands, approval boundary, handoff path, untrusted
input; optional routing fields on bug/feature; /ship waits when finish line
is missing; CONTRIBUTING or recipes pointer. Do not add Cursor Automations.
Commit. Update TRACKING.md and Evidence.
```
