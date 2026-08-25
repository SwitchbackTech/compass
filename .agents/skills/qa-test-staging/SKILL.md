---
name: qa-test-staging
version: 1
owner: compass-maintainers
last_verified: 2026-08-25
description: Runs the Compass post-deploy staging confidence sweep in a user-connected browser, verifies the expected signed-in test profile, exercises core flows, checks console/network failures, and reports evidence. Use when explicitly invoked with /qa-test-staging.
disable-model-invocation: true
---

## When

Explicitly invoked with `/qa-test-staging` after a staging deploy.

## Steps

Select signed-in browser → core sweep → changed flows → anonymous sweep → report.

## Output

Evidence of staging confidence; console/network notes.

## Pass

Expected test profile verified; core flows exercised.

## Anti-patterns

Do not substitute an isolated browser when a signed-in profile is required.
See [`_evals/anti-patterns.md`](../_evals/anti-patterns.md).

## Escalate

Wrong profile, staging down, or credentials the agent must not enter.

# Test Compass staging

Test `https://staging.compasscalendar.com` in a user-connected browser after a
deploy. Prefer Cursor's browser control in Cursor, Claude-in-Chrome in Claude,
or another real-profile browser tool. Do not substitute an isolated browser
when the flow depends on an existing signed-in profile.

## Safety boundaries

- Do not enter credentials or automate Google OAuth.
- Do not guess which browser profile is correct.
- Verify signed-in state from the account control before changing data.
- Never fall back to a temporary account and report an authenticated pass.
- Stop and ask the user to connect/sign in the staging profile when no suitable
  session is available.
- Do not delete created artifacts without explicit approval.

Expected authenticated test account: `compasscaltest3@gmail.com`.
`Temporary account` indicates the anonymous/local profile.

## 1. Select and verify the browser

1. List connected browser tabs/profiles using the available browser tooling.
2. Navigate a fresh tab to staging.
3. Inspect the account control:
   - expected test email → proceed
   - `Temporary account` → this is not the authenticated target
4. If multiple valid sessions exist, ask the user which to use. If none exist,
   stop with the exact connection/sign-in action required.
5. Lock the selected tab/session when the browser tool supports locking.

## 2. Core authenticated sweep

Confirm each action from rendered state, not merely a successful click. Capture
a screenshot when supported and inspect console/network errors throughout.

1. **Load and auth** — staging renders and the expected account remains shown.
2. **Calendar event** — create a uniquely named timed event, move or resize it,
   open its details, switch Day/Week views, reload, and confirm persistence.
3. **Navigation** — previous/next date, month navigation, and date-picker jump.
4. **Commands** — open the command palette and shortcuts panel; complete one
   palette action end-to-end.
5. **Google state** — observe connection/import status without reconnecting or
   mutating OAuth unless the user explicitly requested that scenario.

A visually successful flow with a thrown exception or failed request is a
finding.

## 3. Recently changed flows

Inspect recently merged pull requests against `main` with `gh`. Select the
deploy window the user named; if no window was given, cover the latest relevant
merge rather than guessing a large range.

For each selected pull request:

1. Read its summary and completed validation/test evidence.
2. Derive the user-visible flow changed.
3. Replay that flow on staging.
4. Attribute any regression to the pull request only when evidence supports it.

Do not revive stale unchecked manual-testing sections as requirements.

## 4. Anonymous sweep

Run anonymous coverage only when a separate connected profile visibly reports
`Temporary account`. Recheck the core create/edit/persistence behavior there,
then return to the authenticated profile. If unavailable, report it as skipped,
not failed.

## 5. Report and cleanup

Report:

- **Objective breakage** — flow, observable failure, console/network evidence,
  screenshot, and related pull request when established
- **Worth review** — visual or interaction concerns requiring judgment
- **Clean** — exact flows completed
- browser/profile identity, account state, and any skipped coverage
- artifacts created during testing

Ask whether to remove created artifacts. If approved, use the app's visible
delete controls, reload, and confirm deletion persisted. Unlock the browser tab
when finished.
