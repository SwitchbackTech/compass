# Restructure ledger

Manager-owned. Update at every handoff. Do not append narrative; change the
row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | docs-session | done | `wip/restructure/` | this directory exists; WPs have finish lines and session prompts | — | 0 | none (docs-only pack) |
| WP-01 | high | — | queued | [WP-01-verify-ci-parity.md](WP-01-verify-ci-parity.md) | — | when picked up: +1 session | 0 | none |
| WP-02 | high | — | queued | [WP-02-typed-handoff-ledger.md](WP-02-typed-handoff-ledger.md) | — | when picked up: +1 session | 0 | none |
| WP-03 | high | — | queued | [WP-03-split-ship-review-verifier.md](WP-03-split-ship-review-verifier.md) | — | after WP-02 `done` | 0 | none |
| WP-04 | high | Implementer | verifying | [WP-04-hard-constraints.md](WP-04-hard-constraints.md) | checker + PR-body job on `cursor/hard-constraints-72ec`; WP-01 still unmerged | after WP-01 merge | 0 | none |
| WP-05 | medium | — | queued | [WP-05-skill-registry.md](WP-05-skill-registry.md) | — | after WP-03 `done` | 0 | none |
| WP-06 | medium | — | queued | [WP-06-autofix-routine.md](WP-06-autofix-routine.md) | — | after WP-02 and WP-03 `done` | 0 | none |
| WP-07 | medium | — | queued | [WP-07-agent-ready-intake.md](WP-07-agent-ready-intake.md) | — | after WP-02 `done` | 0 | none |
| WP-08 | low | — | queued | [WP-08-architecture-as-training.md](WP-08-architecture-as-training.md) | gated: only if discovery remains the bottleneck after WP-01–05 | after WP-05 `done` + scale-gate review | 0 | human: run or cancel |

## Delivery-loop baseline (fill after WP-03)

Run `/ship` (or the successor Manager skill) three times on real work.
Record elapsed minutes, exceptions, quality 1–5, rework.

| run | date | task_id | minutes | exceptions | quality | rework | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

## Five evidenced passes (deletion gate)

| # | date | PR | verifier verdict | human routing? | notes |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

## Weekly scorecard (optional after pass 5)

| week | completion | rework | interruptions | recovery_min | notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-25 | PACK | squash-merge 403 for this PAT (`pull_request: write`) | human merges #2865, then #2866, then stacked PRs | `gh pr merge` and REST merge both 403 | WP-01–07 stay off main | leave PRs open and keep implementing |
