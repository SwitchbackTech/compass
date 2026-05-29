---
name: bug-capture
description: Capture a reported bug as a high-context GitHub issue after targeted diagnosis. Use when a user reports a bug, shares reproduction steps or screenshots, and wants the issue tracker to contain enough context for a later agent to fix it quickly.
---

# Bug Capture

Capture a real bug as a GitHub issue with enough evidence for a later agent to
fix it quickly: workflow, screenshot evidence, diagnosis, likely fix, and
verification path.

## Rules

- Investigate, but do not fix: no product-code edits, branches, commits, or
  leftover temporary files.
- Do not overstate certainty. Say when a bug was reproduced, when it was not
  reproduced, and how confident you are in the diagnosis.
- Spend tokens on evidence that changes the issue. Summarize long logs, files,
  and screenshots instead of pasting them.

## Process

### 1. Gather

Use existing context first: reporter description, screen/route/feature,
workflow, actual result, expected result, environment/account state, screenshot,
logs, and issue links.

For screenshots:

- Inspect attached screenshots and summarize what matters.
- Use `[screenshot]` in the issue unless the reporter provides a real URL or
  safe path to reference.
- Keep image observations in the summary or diagnosis, not in a long screenshot
  section.

### 2. Investigate

Inspect before asking questions.

- Read only relevant domain docs (`CONTEXT.md`, feature docs, ADRs).
- Search for the reported screen, route, component, API, event, or error text.
- Check nearby tests and recent local patterns.
- Reproduce or run the narrowest practical UI/API/test flow when available.
- Use sub-agents only for independent questions; ask each for concise findings.

Record concrete evidence: whether you reproduced it, commands/run results,
browser observations, likely affected files/modules, and confidence.

### 3. Clarify

Ask questions only after investigation, only for facts you cannot infer.

- Ask one question at a time.
- Ask at most 3 questions total.
- Include your recommended/default answer.
- Focus on missing screen/step, reproducibility, expected behavior, or relevant
  account/auth/Google/self-hosted state.

If key facts are still missing, publish a useful issue with an information-needed
label.

### 4. Prepare GitHub

- Use GitHub Issues through `gh`, inferred from the current repo remote.
- Ensure a `bug` label exists; create it if missing.
- Normal capture: apply `bug` and `needs-triage`.
- Incomplete capture: apply `bug` and `needs more info`. If an obvious equivalent
  already exists use it instead of creating a  duplicate.

### 5. Dedupe

Search open issues with screen, route, workflow, error, and symptom keywords.

- Strong duplicate: comment on it with the new workflow, screenshot placeholder,
  diagnosis, likely fix, and verification path.
- Weak match: create a new issue and mention the possible relation.
- No match: create a new issue.

### 6. Publish

Use title format:

```text
<area>: <observable broken behavior>
```

Use this body:

```md
## Bug report

Short summary of what is broken and who is affected.

## Where it happened

Route, screen, feature, environment, or account state.

## Workflow

1. Reporter step.
2. Reporter step.
3. What happened.

## Expected outcome

What should have happened.

## Screenshot

[screenshot]

## Diagnosis

Reproduction status, strongest evidence, likely affected files/modules,
confidence, and related issue if any.

## Likely fix

Concrete handoff prompt for the fixing agent: where to start and what behavior
to preserve.

## Verification

Shortest practical flow, test, or command proving the fix.
```

If publishing fails, report the failure and provide the draft body.

### 7. Report

Return the issue URL, whether it was new or a duplicate comment, any missing
information, and a short plain-English diagnosis/likely-fix summary.
