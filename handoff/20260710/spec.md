# July 10, 2026

## [ ] feat(web): replace alerts with error

<https://github.com/SwitchbackTech/compass-calendar/issues/1871>

## feat(web): make the sidebar adjustable

### Problem

The user is able to adjust parts of the layout already, like narrowing the window to adjust how many day columns are in view and dragging the task list width. However, they cannot adjust the left sidebar at all. It's width is fixed.

### Solution

Allow the sidebar to be adjusted via click and drag and also by tabbing focus and using the arrow keys, just like how the task list divider works. The sidebar width should persist across refreshes.

- Add a sensible max-width

## [ ] fix(web): add better SEO

<https://github.com/SwitchbackTech/compass-calendar/issues/1876>

Close the issue when you're done.

## [ ] fix(web): allow user to click once to select date in all-day form

problem: currently the user has to click twice before a date is selected

- They click an all day event, then they click the start/end date input. The datepicker opens
- Then the user mouses over a new date. The hover effect on the date renders, indicating giving the user the impression that they can click it.
- The user clicks the new date, but nothing happens.
- The user  clicks the new date again, and this time the date is selected and the datepicker closes

solution: allow the user to select a date with just one click

cleanup: after you've fixed the bug and protected regressions with test(s), use this as an opportunity to cleanup the datepicker code. I'm confident there are other bugs or ineffeciencies in the code lurking.

## [ ] style(web): adjust a repeat icon

context: PR #1993 added a repeat icon to the bottom left of repeat events.

### problem

- Position: The bottom left is too visually attention-grabbing for users, because it competes with the title and time labels, which are also on the left. It also overlaps the text when there is a 15-minute event.
- Color: the white color is too visually loud

### solution

- position: move it to the bottom-right
- color: adjust the color based on the event's priority by using the darker equivalent, similar to what we're doing with the event forms. Do not hard-code the color. Instead, just take whatever color is associated with the priority and darken/lighten it as needed so that it always complements the event instead of being always white.
