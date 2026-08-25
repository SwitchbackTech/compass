---
name: handoff
description: Compact the current conversation into a typed in-repo handoff so a fresh agent can continue the work.
argument-hint: "What will the next session be used for?"
---

Write a typed handoff so a fresh agent can continue without the producer
transcript. Follow [`.agents/handoffs/SCHEMA.md`](../../handoffs/SCHEMA.md).

If the user passed arguments, treat them as the next session’s focus and
tailor `to`, `artifact`, and `evidence` accordingly.

## Write path

1. Collect required fields: `task_id`, `from`, `to`, `owner`, `status`,
   `artifact`, `evidence`. Also fill `assumptions`, `open_risks`,
   `next_deadline`, `retry`, `approval`, `waiting_on`, `escalation`.
2. If `task_id`, `owner`, `status`, `artifact`, or `evidence` is missing,
   **stop**. Request the missing field. Do not write a file. Do not fall
   back to OS temp. Do not write `status: waiting` as a substitute for
   missing evidence.
3. Validate against the schema: `schema_version: 1`, status enum, exactly
   one `owner`, artifact pointers that exist, evidence commands/results
   that are not invalid completions ("done", "looks good", and the rest
   listed in the schema).
4. If the workspace is not writable, escalate. Never write to OS temp.
5. Write `.agents/handoffs/<task_id>.md` with YAML frontmatter matching the
   schema, then an optional short body. The body is not required to act.
6. Update [`.agents/ledger.md`](../../ledger.md) in the same turn (create
   it if absent): one row per in-flight `task_id`. Change the row; do not
   append a transcript.
7. Include a "suggested skills" section in the body.
8. Do not duplicate PRDs, plans, ADRs, issues, commits, or diffs — link
   them by path or URL.
9. Redact secrets: API keys, passwords, tokens, `compass.yaml` contents,
   personal calendar data, and personally identifiable information.
10. Delete the handoff file in the same commit that closes the task, except
    the documented `issue-0` example.

## Suggested skills

After the record is written, list skills the receiver should invoke
(for example `/verify-change`, `/ship`, `/local-dev-bootstrap`).
