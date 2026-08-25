# Agent handoffs

Typed records for the next session. Schema:
[SCHEMA.md](SCHEMA.md). Skill: `/handoff`.

Write `.agents/handoffs/<task_id>.md` in this directory. Update
[`.agents/ledger.md`](../ledger.md) in the same turn. Do not write to OS
temp.

`issue-0.md` is the documented example. Delete live handoffs in the same
commit that closes the task (`status: done` or escalated-and-closed). Do
not commit secrets, `compass.yaml` contents, tokens, or personal calendar
data.
