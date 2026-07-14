## Summary

<!-- What changed and why. -->

## Test plan

<!-- How you verified this: commands run, manual steps, screenshots/recordings. -->

## Accessibility checklist

Only for UI changes. Skip anything not touched by this PR - see the
"Accessibility Testing" section of
[docs/development/testing-playbook.md](../docs/development/testing-playbook.md)
for what automation already covers.

- [ ] Keyboard-only: reached and operated the changed UI with Tab/Shift+Tab
      and arrow keys, with a visible focus indicator throughout
- [ ] Exercised dynamic content the changed flow introduces (dialogs, menus,
      validation/error states) rather than just the resting page
- [ ] Checked browser zoom/reflow at 200% and 400% if layout changed
- [ ] Checked screen-reader names/announcements (e.g. VoiceOver) if roles,
      labels, or live regions changed
- [ ] Checked reduced-motion / forced-colors behavior if this PR touches
      animation or relies on color alone
