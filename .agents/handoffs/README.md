# Agent handoffs

Typed records for the next session. Schema:
[SCHEMA.md](SCHEMA.md). Skill: `/handoff`.

Write `.agents/handoffs/<task_id>.md` in this directory. Status lives on
the GitHub issue (labels, open PR, closed), never in a shared file: one
row per PR in one table made every PR conflict with every other. Do not
write to OS temp.

`issue-0.md` is the documented example. Delete live handoffs in the same
commit that closes the task (`status: done` or escalated-and-closed). Do
not commit secrets, `compass.yaml` contents, tokens, or personal calendar
data.
