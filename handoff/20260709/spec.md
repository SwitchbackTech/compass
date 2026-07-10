# July 9, 2026

## [x] feat: allow events to have empty title

<https://github.com/SwitchbackTech/compass-calendar/issues/1871>

## [x] fix(web): adjust logout menu and cmd

- see logout-msg.png in this dir
- Problems:
  - The logout and cancel buttons are not positioned intuitively
  - The "You'll lose access.." text isn't aligned with the "Log out?" header
  - The buttons aren't aligned with the "Log out" header
  - The buttons are in an unintuitive order
  - The 'z' shortcut keycap appears in the cmd palette, event when we don't support it anymore
- Solutions
  - remove the 'z' keycap preview from the "Log Out" option in the command palette
  - Align vertically
  - Reorder buttons to be 'Log out' and then 'Cancel' (don't add extra tests just for the ordering, that's overkill)

## [x] fix(web): make copy in loader and elsewhere more human

Problem: The spinner that shows after a redirect happens says "Completing Google authorization...". Users don't know what 'authorization means'. The language is developer-focused instead of user focus
Solution: Rename that loading message to be "Just finishing up ..."

- For other user-facing message, make them more colloquial and functional rather than displaying developer-focused language

## [x] fix: when quickly nudging, the event lags behind

- for example, when moving a someday event to the grid with SHIFT+RIGHT, the event shows up successfully, but if the user keeps moving it around, it can't keep up and errors appear.
- also, when a user moves a someday event from the sidebar to the grid, the draft preview shows up immediately. however, when the user finishes and doesn't do anything (they're finally happy with the time), then all their changes are 'replayed': they happen from the top and the user sees the event change one move (and API request) at a time.
  - the draft should always appear immediatly, but we shouldn't trigger a new API request for every move. We might need to throttle/debounce or introduce another mechanism to ensure the API is getting hammered and that we don't need to reply the changes after the user is done in order to keep state in sync
- remember to keep this solution as simple as possible (it could get ugly if we're not careful)

## [x] style(week): adjust the now line to only appear on the current day's column

- problem: the now line is very visually noise
- solution: instead of rendering the now line across the entire grid, just render it on the current day (if the user is viewing the current week). Do not render the now line if the current day is not visible

## [x] style(forms): consolidate form styling

- problem: the someday and regular event forms are both handling stylings slightly differently, resulting in inconsistencies (eg the layout or magin)
- solution: create a shared form component that both the regular and someday event components use
  - this component should be agnostic of what the form contents are; the dev should just be able to use it to ensure things like layouts, margins, floating behavior, etc is consistent

### [x] feat(day): make the default task list width 600

- compass.day.task-list-width

### [x] refactor(web): simplify floating-ui implementations

- refactor custom code to use floating-ui, reducing maintenace burden
- why: we don't need to reinvent the wheel
- IMPORTANT: don't do this until after moving the form to the sidebar.
- also update agent docs for guidance on this so its used going forward
- when to use floating-ui:
  - tooltips
  - popovers
  - select menus
  - comboboxes
  - dropdown menus
  - dialogs

### [x] fix(day): user cannot migrate task when thumb icon is focused

- expected: when a user has focused on the thumb icon to the left of a task and types the cmd+ctrl+arrow hotkey, the task should be migrated
- actual: nothing happens
- reason: this is important because we want to give the user confidences that they can always migrate a task with the keyboard easily

#
