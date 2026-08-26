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
| 2878 | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2878 | bun run verify: web, type-check, lint, knip passed; bun test:a11y 7 passed | 2026-08-26T03:00:00Z | 0 | none |
| 2879 | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2879 | bun run verify PASS; review: no confirmed findings | 2026-08-26T06:00:00Z | 0 | none |
| 2885 | high | Manager | escalated | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2885 | stale unit coverage 93/93 and affected E2E 9/9 pass; GitHub required workflows missing on current head | 2026-08-27T12:00:00Z | 2 | human |
| WP-shortcut-showcase-simplify | medium | Manager | verifying | .agents/handoffs/WP-shortcut-showcase-simplify.md | verifier PASS; simplify no change; independent re-review no findings | 2026-08-26T23:00:00Z | 2 | none |
