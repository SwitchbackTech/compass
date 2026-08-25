# Skill registry

Durable methods for Compass agents. One row per `.agents/skills/<name>/`
directory. This is not a JS/TS barrel; import nothing from here.

Bump `version` in `SKILL.md` frontmatter when the method changes, add a
one-line note in **Change log** below, and leave the previous body in
git. Revert = `git revert`. Do not copy `SKILL.v1.md` unless a change is
risky enough to warrant a side-by-side file.

Shared stop rules: [`_evals/anti-patterns.md`](_evals/anti-patterns.md).
Eval stubs: [`_evals/README.md`](_evals/README.md).

| name | version | owner | role | last_verified |
| --- | --- | --- | --- | --- |
| a11y-audit | 1 | compass-maintainers | specialist | 2026-08-25 |
| chaos | 1 | compass-maintainers | specialist | 2026-08-25 |
| google-sync-debug | 1 | compass-maintainers | specialist | 2026-08-25 |
| handoff | 1 | compass-maintainers | specialist | 2026-08-25 |
| local-dev-bootstrap | 1 | compass-maintainers | specialist | 2026-08-25 |
| qa-test-staging | 1 | compass-maintainers | specialist | 2026-08-25 |
| review | 1 | compass-maintainers | reviewer | 2026-08-25 |
| ship | 1 | compass-maintainers | Manager | 2026-08-25 |
| simplify | 1 | compass-maintainers | specialist | 2026-08-25 |
| verify-change | 1 | compass-maintainers | verifier | 2026-08-25 |

## Change log

- 2026-08-25: WP-05 — add `version` / `owner` / `last_verified` to all skills.

`last_verified` on this date is the registry implementation date, not a
production eval run.
