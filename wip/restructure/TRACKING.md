# Restructure ledger

Manager-owned. Update at every handoff. Do not append narrative; change the
row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | docs-session | done | `wip/restructure/` | this directory exists; WPs have finish lines and session prompts | — | 0 | none (docs-only pack) |
| WP-01 | high | — | queued | [WP-01-verify-ci-parity.md](WP-01-verify-ci-parity.md) | — | when picked up: +1 session | 0 | none |
| WP-02 | high | cursor-agent | verifying | [WP-02-typed-handoff-ledger.md](WP-02-typed-handoff-ledger.md) | schema + in-repo `/handoff` + ledger; issue-0 example valid; dry-run write/delete yes | this session | 0 | none |
| WP-03 | high | cursor-agent | verifying | [WP-03-split-ship-review-verifier.md](WP-03-split-ship-review-verifier.md) | `/ship` Manager; `/review` added; verify-change verdict format | this session | 0 | none |
| WP-04 | high | — | queued | [WP-04-hard-constraints.md](WP-04-hard-constraints.md) | — | after WP-01 `done` | 0 | none |
| WP-05 | medium | — | queued | [WP-05-skill-registry.md](WP-05-skill-registry.md) | — | after WP-03 `done` | 0 | none |
| WP-06 | medium | — | queued | [WP-06-autofix-routine.md](WP-06-autofix-routine.md) | — | after WP-02 and WP-03 `done` | 0 | none |
| WP-07 | medium | — | queued | [WP-07-agent-ready-intake.md](WP-07-agent-ready-intake.md) | — | after WP-02 `done` | 0 | none |
| WP-08 | low | — | queued | [WP-08-architecture-as-training.md](WP-08-architecture-as-training.md) | gated: only if discovery remains the bottleneck after WP-01–05 | after WP-05 `done` + scale-gate review | 0 | human: run or cancel |

## Delivery-loop baseline (fill after WP-03)

Run `/ship` (or the successor Manager skill) three times on real work.
Record elapsed minutes, exceptions, quality 1–5, rework.

| run | date | task_id | minutes | exceptions | quality | rework | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-08-25 | WP-01 | — | 0 | 4 | 0 | PR #2865: verify CI parity; CI 20/20; merge 403 |
| 2 | 2026-08-25 | WP-02 | — | 0 | 4 | 0 | PR #2866: typed handoff; scripts test for CI |
| 3 | 2026-08-25 | WP-03 | — | 0 | 4 | 0 | this branch: Manager/review/verifier split |

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
| 2026-08-25 | WP-01 | squash-merge of PR #2865 (CI 20/20) | merge with a token that has `pull_request: write` | `gh pr merge --squash` and REST merge both 403 on this PAT | pack stays blocked before WP-04 | leave #2865 open; continue WP-02 |
