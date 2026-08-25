# Agent ledger

Manager-owned. Update at every typed handoff. Delete rows when status is
`done` or escalated-and-closed. GitHub is the human inbox; this table is
what the Manager reads first.

Do not append transcripts. Change the row. One current `owner` per
`task_id`. `priority` is ledger-only (not a handoff field); default `medium`
when unknown. The documented example is `.agents/handoffs/issue-0.md`, not a
ledger row.

Status: `queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WP-05 | medium | cursor-agent | waiting | `.agents/skills/README.md` | PR #2872 | 2026-08-26T18:00:00Z | 0 | none |
| WP-06 | medium | Verifier | verifying | `docs/CI-CD/error-autofix-routine.md` | `bun test packages/scripts/src/testing/error-autofix-routine.test.ts` | 2026-08-26T18:00:00Z | 0 | none |
