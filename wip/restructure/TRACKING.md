# Restructure ledger

Manager-owned. Update at every handoff. Do not append narrative; change the
row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` | `escalated`

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | docs-session | done | `wip/restructure/` | this directory exists; WPs have finish lines and session prompts | — | 0 | none (docs-only pack) |
| WP-01 | high | cursor-agent | done | [WP-01-verify-ci-parity.md](WP-01-verify-ci-parity.md) | merged #2865 (`31c73f336`); `bun run verify` selected scripts → type-check → lint → knip | — | 0 | none |
| WP-02 | high | cursor-agent | done | [WP-02-typed-handoff-ledger.md](WP-02-typed-handoff-ledger.md) | merged #2866 (`8cc2a03ca`); schema + in-repo `/handoff` + ledger | — | 0 | none |
| WP-03 | high | cursor-agent | done | [WP-03-split-ship-review-verifier.md](WP-03-split-ship-review-verifier.md) | merged #2867 (`024925eb2`); `/ship` Manager; `/review`; verify-change verdict | — | 0 | none |
| WP-04 | high | Implementer | done | [WP-04-hard-constraints.md](WP-04-hard-constraints.md) | merged #2868 (`d2e3946d9`); checker in lint; pr-body workflow | — | 0 | none |
| WP-05 | medium | cursor-agent | done | [WP-05-skill-registry.md](WP-05-skill-registry.md) | merged #2872 (`84902a18d`); skill versions + registry + eval stubs | — | 0 | none |
| WP-06 | medium | cursor-agent | verifying | [WP-06-autofix-routine.md](WP-06-autofix-routine.md) | `docs/CI-CD/error-autofix-routine.md`; drills documented, not run | this session | 0 | none |
| WP-07 | medium | cursor-agent | done | [WP-07-agent-ready-intake.md](WP-07-agent-ready-intake.md) | merged #2869 (`125c3f0fd`); `3-agent-task.yml`; label `agent-ready` | — | 0 | none |
| WP-08 | low | — | queued | [WP-08-architecture-as-training.md](WP-08-architecture-as-training.md) | gated: only if discovery remains the bottleneck after WP-01–05 | after WP-05 `done` + scale-gate review | 0 | human: run or cancel |

## Delivery-loop baseline (fill after WP-03)

Run `/ship` (or the successor Manager skill) three times on real work.
Record elapsed minutes, exceptions, quality 1–5, rework.

| run | date | task_id | minutes | exceptions | quality | rework | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-08-25 | WP-01 | — | 0 | 4 | 0 | PR #2865 merged `31c73f336` |
| 2 | 2026-08-25 | WP-02 | — | 0 | 4 | 0 | PR #2866: typed handoff; scripts test for CI |
| 3 | 2026-08-25 | WP-03 | — | 0 | 4 | 0 | PR #2867 merged `024925eb2` |

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
| 2026-08-25 | WP-01 | squash-merge of PR #2865 (CI 20/20) | merge with git App token (`contents=write`) | `GH_TOKEN` PAT 403 on merge API (`contents=write` missing) | resolved | merged #2865 then #2866 with git App token |
