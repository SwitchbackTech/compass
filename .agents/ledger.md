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
| 2980 | high | Manager | waiting | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2980 | verify PASS (web, type-check, lint, knip, a11y, e2e); review: no confirmed findings | 2026-08-31T00:00:00Z | 1 | none |
| 2878 | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2878 | bun run verify: web, type-check, lint, knip passed; bun test:a11y 7 passed | 2026-08-26T03:00:00Z | 0 | none |
| 2879 | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2879 | bun run verify PASS; review: no confirmed findings | 2026-08-26T06:00:00Z | 0 | none |
| WP-shortcut-showcase-simplify | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2890 | verifier PASS; simplify no change; independent re-review no findings | 2026-08-26T23:00:00Z | 2 | none |
| 2891 | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2893 | bun run verify PASS; review: no confirmed findings | 2026-08-27T00:00:00Z | 0 | none |
| 2898 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2898 | focused web 62 pass; lint clean of new errors; review: no confirmed findings | 2026-08-27T06:00:00Z | 0 | none |
| 2918 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2918 | bun run verify PASS; review finding fixed in 3fa6e4a8c | 2026-08-27T20:30:00Z | 0 | none |
| 2922 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2922 | bun run verify PASS; simplify c4cbe8696; review: no confirmed findings | 2026-08-27T21:00:00Z | 0 | none |
| simplify-recent-2965 | medium | Manager | verifying | packages/web/src/shortcuts/quick-time/quick-time.util.ts | bun run verify PASS: web, type-check, lint, knip; review: no confirmed findings | 2026-08-31T06:00:00Z | 0 | none |
| simplify-docs-ci | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3039 | verify PASS; review no findings; item 1 resolved by e6a2b7fc0 | 2026-08-31T18:00:00Z | 0 | none |
| simplify-account-deletion | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3039 | backend 496 passed, 1 skipped; re-review no findings | 2026-08-31T18:00:00Z | 2 | none |
| simplify-keyboard-mode | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3039 | focused keyboard 49 passed; re-review no findings | 2026-08-31T18:00:00Z | 0 | none |
