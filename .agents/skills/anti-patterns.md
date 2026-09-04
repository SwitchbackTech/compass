# Anti-patterns (shared)

Link this file from skill **Anti-patterns** sections. Do not copy it into
`AGENTS.md`.

- Do not force-push, bypass protection, or rewrite published history
  without explicit authorization.
- Do not weaken tests, widen timeouts, disable strict MSW, or change test
  order to go green.
- Never edit tests, CI config, or `verify.ts` to turn a failing verdict green.
- Do not test login flows without the required backend setup.
- Do not treat `VERDICT: INCOMPLETE` as a pass; install Chromium and rerun.
- Do not invent findings, packages, or completion when the diff is empty
  or access is missing.
