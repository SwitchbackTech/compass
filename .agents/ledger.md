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
| 3139 | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3204 | bun run verify PASS (web, type-check, lint, knip, a11y 24, e2e 110); review: no confirmed findings | 2026-09-04T06:00:00Z | 0 | none |
| 3138 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3202 | squash-merged 144c0690f; bun run verify PASS; review: no confirmed findings | null | 0 | none |
| 3137 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3201 | squash-merged 2ac4e9a5c; bun run verify PASS; review: no confirmed findings | null | 0 | none |
| 3136 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3200 | squash-merged db747490e; bun run verify PASS; review: no confirmed findings | null | 0 | none |
| 3133 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3199 | squash-merged 12bfcaa97; bun run verify PASS; review: no confirmed findings | null | 0 | none |
| 3135 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3197 | bun run verify PASS (web shards 1617/1592, a11y 24, e2e 109); review: no confirmed findings after hours-draft fix | null | 0 | none |
| 3162 | high | Founder | waiting | docs/features/billing.md | bun run verify PASS (type-check, lint, knip); founder staging QA waiting | 2026-09-10T00:00:00Z | 0 | human |
| 3134 | high | Manager | done | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3195 | bun run verify PASS (web 1613, a11y 24, e2e 109); review: no confirmed findings | null | 0 | none |
| 3158 | high | Implementer | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/3168 | bun test:web 1569 pass; type-check pass; lint exit 0; knip pass | 2026-09-04T00:00:00Z | 0 | none |
| 3129 | high | Verifier | verifying | packages/web/src/booking/BookingSettingsSection.tsx | bun test:web 30 pass; host-settings e2e 5 pass; test:a11y 24 pass; bun run verify PASS | 2026-09-03T20:00:00Z | 0 | none |
| simplify-recent-3098 | medium | Manager | verifying | .agents/handoffs/simplify-recent-3098.md | bun run verify PASS (core, web, backend, type-check, lint, knip); focused web 161 pass; review: no confirmed findings | 2026-09-03T06:00:00Z | 1 | none |
| simplify-recent-3047 | medium | Manager | verifying | .agents/handoffs/simplify-recent-3047.md | focused web 79 pass; core/sync 49 pass; verify package checks pass; a11y retry pass; review: no confirmed findings | 2026-09-02T06:00:00Z | 1 | none |
| 2980 | high | Manager | waiting | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2980 | verify PASS (web, type-check, lint, knip, a11y, e2e); review: no confirmed findings | 2026-08-31T00:00:00Z | 1 | none |
| 2878 | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2878 | bun run verify: web, type-check, lint, knip passed; bun test:a11y 7 passed | 2026-08-26T03:00:00Z | 0 | none |
| 2879 | high | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2879 | bun run verify PASS; review: no confirmed findings | 2026-08-26T06:00:00Z | 0 | none |
| WP-shortcut-showcase-simplify | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2890 | verifier PASS; simplify no change; independent re-review no findings | 2026-08-26T23:00:00Z | 2 | none |
| 2891 | medium | Manager | verifying | https://github.com/KeepSoftwareSimple/compass-calendar/pull/2893 | bun run verify PASS; review: no confirmed findings | 2026-08-27T00:00:00Z | 0 | none |
| 2898 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2898 | focused web 62 pass; lint clean of new errors; review: no confirmed findings | 2026-08-27T06:00:00Z | 0 | none |
| 2918 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2918 | bun run verify PASS; review finding fixed in 3fa6e4a8c | 2026-08-27T20:30:00Z | 0 | none |
| 2922 | medium | Manager | verifying | https://github.com/keepsoftwaresimple/compass-calendar/pull/2922 | bun run verify PASS; simplify c4cbe8696; review: no confirmed findings | 2026-08-27T21:00:00Z | 0 | none |
| simplify-recent-2965 | medium | Manager | verifying | packages/web/src/shortcuts/quick-time/quick-time.util.ts | bun run verify PASS: web, type-check, lint, knip; review: no confirmed findings | 2026-08-31T06:00:00Z | 0 | none |
