# Agent ledger

Manager-owned. Update at every typed handoff. Delete rows when status is
`done` or escalated-and-closed. GitHub is the human inbox; this table is
what the Manager reads first.

Do not append transcripts. Change the row. One current `owner` per
`task_id`.

Status: `queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| issue-0 | low | Verifier | verifying | `.agents/handoffs/SCHEMA.md` | `test -f .agents/handoffs/SCHEMA.md` → pass (documented example) | 2026-08-26T18:00:00Z | 0 | none |
