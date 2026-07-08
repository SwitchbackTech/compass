---
name: qa-staging
description: Post-merge QA sweep of staging.compasscalendar.com in the user's real Chrome - select and verify the correct signed-in staging profile (never the localhost/temp-account one), run the standard usage flows as the authed test user watching console/network for breakage, then read the recent merged PRs and exercise their Manual Testing Steps to catch regressions in freshly-touched flows. Use when the user says "/qa-staging", "sanity check staging", "test staging", "check staging after deploy", "run the staging sweep", or asks to verify the staging deploy after a PR merged.
---

# qa-staging

The manual ritual this replaces: after a PR merges and auto-deploys to
`staging.compasscalendar.com`, a human opens staging as an anonymous user,
then as the signed-in test user (`compasscaltest3@gmail.com`), runs the
standard flows, then reads the recently-merged PRs and re-tests whatever
they touched, looking for anything broken by the deploy.

This skill drives that in the user's **real Chrome** via `claude-in-chrome`,
not `preview_*` — the whole point is to test the actually-deployed staging
site in the user's actual browser session, not a headless local instance.

**Two things this skill can never do, by design — do not try:**

- **It does not log in.** Entering credentials is off-limits, and Google
  OAuth blocks automation anyway. The authed session must already exist in
  the selected Chrome profile (the user signs in by hand, once; the session
  persists). This skill's job is to *verify* it's signed in, then drive it.
- **It does not switch Chrome profiles.** The MCP targets a browser (a
  profile) by `deviceId`; it can't reach in and change which profile a
  browser shows. The user must have the `claude-in-chrome` extension
  connected in the staging profile. This skill selects the right connected
  browser and proves its identity by observed auth state.

If either precondition isn't met, stop and tell the user exactly what to do
(connect the extension in the staging profile / sign in as the test user) —
never quietly fall back to a temp-account session and report a green sweep.

## 0. Pre-flight

- Load the Chrome tools if deferred (one batched `ToolSearch` call):
  `ToolSearch("select:mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser,mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests")`.
- Constants for this repo:
  - Staging URL: `https://staging.compasscalendar.com`
  - Expected authed account: `compasscaltest3@gmail.com`
  - The toolbar account button's label **is** the auth fingerprint: it reads
    the account email when signed in, and `Temporary account` when not.

## 1. Select the correct browser — verify by auth state, not by name

Do not trust device names (`Browser 1`/`Browser 2`) or a remembered
`deviceId` — ids rotate between reconnects and names carry no meaning. Prove
identity by what the page shows.

1. `list_connected_browsers`. Expect one or more local macOS browsers.
2. If the host requires a browser-choice confirmation (it may inject an
   instruction to call `AskUserQuestion` listing every connected browser),
   follow it: present the list and let the user pick, or let them confirm in
   the extension. Otherwise, disambiguate yourself in the next step.
3. For each candidate browser: `select_browser(deviceId)`,
   `tabs_context_mcp({createIfEmpty: true})`, open a fresh tab with
   `tabs_create_mcp`, `navigate` to the staging URL, then `read_page`
   (`filter: "interactive"`) and look at the account button:
   - Label is `compasscaltest3@gmail.com` → this is the **staging** profile.
     Select it and proceed.
   - Label is `Temporary account` → this is the localhost/logged-out
     profile. Not our target.
4. If exactly one browser is signed in as the expected account, use it and
   tell the user which `deviceId` it was. If none is, **stop**: report that
   no connected browser is signed in as `compasscaltest3@gmail.com`, and ask
   the user to connect the extension in their staging profile (and confirm
   that profile is signed in) before rerunning. If more than one is signed
   in as that account, ask the user which to use — don't guess.

The signed-in-vs-temp-account check is the safety interlock for the whole
skill. Everything after here assumes it passed.

## 2. Authed standard-flow sweep

Run the everyday flows a user relies on, as the signed-in test user, on the
selected browser. Use `computer` to click/type and confirm what actually
rendered with `read_page` (`filter: "interactive"`) plus a screenshot —
don't assume an action worked because the click didn't error. Avoid
`get_page_text` for verification here: this app isn't article-shaped, so it
returns nav/shortcut scaffolding and hour labels rather than the task/event
content you're trying to confirm.

Standard flows (the golden paths; adapt if the app's shell has changed):

1. **Load + auth** — staging loads on the day view, toolbar shows the test
   account (already confirmed in step 1).
2. **Task list** — create a task, edit its text, toggle it complete, and
   confirm each change renders. Reload and confirm it persisted — this
   reload check is what proves the authed remote-storage write actually
   landed, not just that an optimistic UI updated. (Storage rules: authed
   users persist remotely.)
3. **Calendar events** — create a timed event, move/resize it, open it and
   confirm the detail renders; switch Day ↔ Week view and confirm events
   show in both.
4. **Navigation** — previous/next day and month, and the date picker jump.
5. **Command palette + shortcuts** — open the command palette and the
   shortcuts panel; run one palette action (e.g. create event) end to end.

As you go, after each flow check `read_console_messages` and
`read_network_requests` for errors (thrown exceptions, failed/4xx/5xx
requests) the UI wouldn't otherwise surface. A flow that looks fine visually
but fired a 500 is a finding. Note: network/console tracking starts when the
tool is first called, so an early reload (as in flow 2) is a convenient way
to capture a clean pass of load requests.

Screenshot each flow's end state so the report has evidence, not just
assertions.

## 3. PR-driven regression sweep

This is the part the user does by hand today: read what recently shipped and
re-test exactly those flows.

1. Pull recently-merged PRs against main:
   `gh pr list --state merged --base main --limit 10 --json number,title,body,mergedAt`.
   Default to the ones merged since the last deploy the user cares about; if
   unsure of the window, ask how many PRs back to cover (a typical sweep is
   the last 3-6).
2. For each, read the `## Manual Testing Steps` section of the body — the
   `ship` skill writes these as user-observable, click-by-click steps with
   no internal names, which is exactly what you need to replay. If a PR has
   no such section, summarize its `## Summary` and infer the touched flow.
3. Replay each PR's steps on staging in the selected browser, watching
   console/network the same way as step 2. These are the highest-value
   checks — they target code that changed minutes ago.
4. Note which PR each finding traces back to, so a regression is
   attributable to a specific change rather than "something in staging."

## 4. Anonymous sweep (optional, only if that profile is connected)

The anonymous case is a **Temporary account** session, not merely
"cookie-less" — a fresh tab in a logged-out profile exercises the same
temp-account backend path incognito would. True incognito isn't drivable via
the MCP and isn't needed.

Only run this if the user also has the logged-out/localhost profile's
extension connected (it shows up as a second browser whose account button
reads `Temporary account`):

1. `select_browser` that browser; open a fresh tab; navigate to staging;
   confirm the account button reads `Temporary account`.
2. Re-run the core create/edit/complete-task and create-event flows from
   step 2 as a temp account, watching console/network.
3. Re-select the staging browser afterward if any further authed work
   remains, so a later step doesn't run against the wrong session.

If that profile isn't connected, say so and skip — don't treat it as a
failure.

## 5. Report

Group findings by how much they need the user's judgment:

- **Objective breakage** (thrown errors, failed requests, a flow that didn't
  render / didn't persist) — with the flow, the PR it traces to (if any),
  the console/network evidence, and a screenshot.
- **Worth your eyes** (looks off, copy seems wrong, feels janky) — flagged
  for the user, not asserted as a bug.
- **Clean** — the flows that passed, so the user knows coverage, not just
  failures.

Close by stating plainly which browser/`deviceId` and account the sweep ran
against, and which sweeps ran vs. were skipped (e.g. anonymous skipped
because that profile wasn't connected). Never imply broader coverage than
actually ran.

## Cleanup

Flows in step 2 create real objects in the test account (a task, an event).
They're low-stakes test artifacts, but don't silently delete them — leaving
data is reversible, deleting isn't. At the end, list what you created and
ask the user whether to remove it or leave it.

If the user says delete, know the app's real delete trigger before you
start clicking — the task delete shortcut only fires when the task's
**checkbox** has keyboard focus, not its text field
(`handleDeleteTask` guards on `isFocusedOnTaskCheckbox()` in
`useDayViewShortcuts.ts`). So clicking the task text (which enters edit
mode) and pressing Delete/Backspace does nothing. To delete a task:
`left_click` the round checkbox at the left of the row (this focuses it —
and toggles its complete state, which is irrelevant since it's about to be
gone), then press `Backspace`. Confirm the deletion persisted with a reload,
same as any other write. (Calendar events have their own Delete affordance —
open the event and use its delete control rather than assuming the task
shortcut applies.)
