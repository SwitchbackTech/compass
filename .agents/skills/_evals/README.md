# Skill eval stubs

Inputs and expected stop/output for later automation. This directory is
not a runner. Point a stub at a real skill or command.

| Case | File | What it proves |
| --- | --- | --- |
| normal | [normal.md](normal.md) | `/verify-change` / `/ship` routing on a known-correct scripts diff |
| incomplete | [incomplete.md](incomplete.md) | empty diff or missing access must clarify, not invent |
| tool-fail | [tool-fail.md](tool-fail.md) | failed `bun run verify` must not become PASS |
| policy | [policy.md](policy.md) | login-without-backend, force-push, denied autofix path stop |

Anti-patterns shared across skills: [anti-patterns.md](anti-patterns.md).
