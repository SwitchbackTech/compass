# Handoff schema (v1)

Versioned contract for passing work between agent sessions. Pass artifacts
and evidence pointers, not transcripts. Unknown `schema_version` values are
rejected; the Manager keeps the producer artifact.

Files live at `.agents/handoffs/<task_id>.md`. YAML frontmatter is required
and must match this schema. A short markdown body after the frontmatter is
optional context and is **not** required to act.

## Status enum

`queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

## Write-gate vs full record

`/handoff` **refuses to write** unless these are present: `task_id`, `owner`,
`status`, `artifact`, `evidence`.

A valid v1 file must still include every field in the table. Use empty lists,
`0`, `none`, or `null` when there is nothing to report. Do not omit keys.

## Required fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Integer. Receivers accept `1` only. |
| `task_id` | GitHub issue, PR number, or `WP-*` / branch name until WP-07. |
| `from` | Role that produced this record. |
| `to` | Role that should act next. |
| `owner` | Exactly one current owner. |
| `status` | One value from the enum. |
| `artifact` | Pointers (repo `path` and/or `url`) that exist. |
| `evidence` | How to check: `command` + `result` + optional `log` pointer. |
| `assumptions` | List. Empty list is allowed. |
| `open_risks` | List. Empty list is allowed. |
| `next_deadline` | ISO-8601 timestamp, or `null` only when status is `done`. |
| `retry` | Non-negative integer. |
| `approval` | `none` \| `ask` \| `human`. |
| `waiting_on` | Dependency name when `status` is `waiting`; otherwise `null`. |
| `escalation` | Packet when `status` is `escalated`; otherwise `null`. |

Separate fact, evidence, and artifact. Do not collapse them into one
summary paragraph. Additive fields in later schema versions are OK;
renaming the meaning of an existing field is not.

## Rejection rules

Refuse to write when `task_id`, `owner`, `status`, `artifact`, or `evidence`
is missing. Refuse to accept a file when:

1. `schema_version` is missing or not `1`.
2. `status` is not in the enum.
3. `owner` is empty or names more than one owner.
4. `artifact` has no existing `path` and no `url`.
5. `evidence` is empty or uses an invalid completion (below).
6. The workspace is not writable — escalate; do **not** fall back to OS temp.
7. `waiting_on` is `null` while `status` is `waiting`, or `escalation` is
   `null` while `status` is `escalated`.

## Invalid completions

These are **not** evidence and must not advance `status` to `done` or
`verifying`:

- "done"
- "looks good"
- "should be fine"
- "tests probably pass"
- any claim with no command/log/path/url pointer that exists

Status only advances when `artifact` points at an existing path or URL and
`evidence` has a runnable `command` plus a non-phrase `result`.

## Valid example

The documented file is [issue-0.md](issue-0.md). Receivers should use that
record, not a second copy here.

## Malformed example (must reject)

```yaml
schema_version: 1
task_id: "issue-0"
from: Implementer
to: Verifier
owner: Verifier
status: done
artifact: []
evidence:
  - command: ""
    result: "looks good"
assumptions: []
open_risks: []
next_deadline: 2026-08-26T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
```

Rejected because `artifact` is empty, `evidence` has no command, and
`result` is an invalid completion phrase.

## Receiver checklist

Given only this file, a receiver must be able to name:

1. `owner`
2. `artifact` (path or URL)
3. the next check (`evidence[].command`)
