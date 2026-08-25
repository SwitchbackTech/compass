# Anti-patterns (shared)

Link this file from skill **Anti-patterns** sections. Do not copy it into
`AGENTS.md`.

- Do not force-push, bypass protection, or rewrite published history
  without explicit authorization.
- Do not weaken tests, widen timeouts, disable strict MSW, or change test
  order to go green.
- Do not write handoffs to an OS temp directory. Use
  `.agents/handoffs/<task_id>.md`.
- Verifier (`/verify-change`) and Reviewer (`/review`) must not edit the
  artifact or production code in the same turn.
- Do not test login flows without the required backend setup.
- Do not claim CI parity when Playwright was skipped.
- Do not invent findings, packages, or completion when the diff is empty
  or access is missing.
