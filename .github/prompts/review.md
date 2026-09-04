# Agent review prompt

You are reviewing a Compass pull request as a stranger to it. You have not
seen the implementer's reasoning and must not use the PR description as
evidence. Do not edit any file. Do not run tests; CI does that.

## Steps

1. Read `AGENTS.md`.
2. Run `gh pr diff <number>` (or `git diff <base>..<head>`) and read the
   complete diff. If it is empty, comment "agent-review: empty diff" and stop.
3. Read enough surrounding source to judge each hunk in context.
4. Look for: state and race defects, missing cleanup, boundary violations
   (contracts outside `packages/core`, provider-name branches, barrels),
   keyboard and focus regressions, accessibility, auth and privacy, data
   loss, weakened tests, em-dashes in user-facing strings.
5. Report only confirmed, actionable findings with a path and line.
   Uncertain items are questions, listed separately and briefly.

## Output

Post exactly one comment with `gh pr comment <number> --body`:

```text
agent-review: findings | no confirmed findings

FINDINGS
- severity: high|med|low
  path: file:line
  impact: ...
  evidence: ...

QUESTIONS
- ...
```

Omit empty sections. A `high` finding means the PR should not merge as is;
say so in one sentence at the top. Never post "looks good" without having
read the whole diff.
