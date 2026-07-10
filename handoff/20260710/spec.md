# July 10, 2026

## [x] feat(web): replace alerts with error

<https://github.com/SwitchbackTech/compass-calendar/issues/1871>

## feat(web): make the sidebar adjustable

### Problem

The user is able to adjust parts of the layout already, like narrowing the window to adjust how many day columns are in view and dragging the task list width. However, they cannot adjust the left sidebar at all. It's width is fixed.

### Solution

Allow the sidebar to be adjusted via click and drag and also by tabbing focus and using the arrow keys, just like how the task list divider works. The sidebar width should persist across refreshes.

- Add a sensible max-width

## [x] fix(web): add better SEO

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

----

## [ ] style(web): adjust sidebar datepicker styles

problem 1: the arrows on the date picker change position across months, resulting in the user deadclicking when navigating.

- cause: the arrow position changes based on how long the month title is. Since months have different character lengths, the arrows are not in the same location across months. see datepicker-problem-too-wide.png

problem 2: when the user expands the sidebar, the month picker's expands proportionatly, which looks weird at the wider widths.

- solution: reduce the datepicker's max width. once it exceeds it, just keep it centered and let there be empty space around it.
- see datepicker-solution-padding.png

## [ ] style(forms): standardize event form width

context: PR 1985 consolidated some form styling, but the someday and grid event forms still have different widths.

- see form-somday-event-width-too-wide.png and form-event-width-good.png

solution: use the current event form's width as the standard. use that width for the someday events.

use this as another opportunity to simplify and clean up our form code. goal is to decouple the form handling basics from the styling and the content. long term, we should be able to pass an arbitrary component to the form component and know that a lof othe for <form>
 semantics and padding will "just work." I'm tentatively planning to move the form to the sidebar rather than leaving it as a floating item, so this preliminary cleanup will help that future effort.

## [ ] fix(web): repeat icon on 15-min events

problem 1: some repeat events that are 15-min in length do not have a visible repeat icon

- if the event was originally 30+ minutes and it was synced in compass, and then the user resized it down to 15-min, then the repeat icon appears
- however, if the event was originally 15-minutes

problem 2: when a user adds a repeat to a draft event, the repeat icon does not appear in the draft preview.

- as soon as the user clicks the repeat field in the form, the repeat icon should render. the draft should always represent the future reality of an event if/when the user saves, so that the user can always visualize their changes and how it'd impact the schedule

## [ ] fix(web): make repeat icons consistent across event types

problem 1: all day events show repeat icon to the left in the white color

- expected: repeat icons should always appear in the bottom right.
- solution: the current timed events have repeat icons in the correct location and use the right color (PR #1998). ensure the all-day events

problem 2: someday repeat events use a different icon and show an annoying preview when hovering to the right

- context: we originally added the 'Can't migrate recurring events' message to be proactive. but that's no longer necessary to show.
- solution: reuse the same repeat icon that the timed grid uses, so that the user can see when a someday event is repeating.
, but make it disabled

## [ ] fix(web): render recurrence changes optimistically

### problem 1: recurrence changes are not saving

 repo steps:

- create a daily recurring event
- ensure it loads in compass correctly
- drag the recurrence to a different time
- when propmted, select to apply changes to all events
- expected: event and all its instances show up with the new times immediately
- actual: nothing happens: event changed and its instances don't adjust

request: 204 <https://staging.compasscalendar.com/api/event/6a511d28e3b1fe6cec6714ac?applyTo=All%20Events>

payload: {
    "_id": "6a511d28e3b1fe6cec6714ac",
    "description": "",
    "endDate": "2026-07-10T11:30:00-06:00",
    "isAllDay": false,
    "isSomeday": false,
    "gEventId": "09ks1auk7m693nvtbkn9jeff49_20260710T181500Z",
    "gRecurringEventId": "09ks1auk7m693nvtbkn9jeff49",
    "origin": "googleimport",
    "priority": "relationships",
    "recurrence": {
        "rule": [
            "RRULE:FREQ=DAILY"
        ],
        "eventId": "6a511d26e3b1fe6cec66acc0"
    },
    "startDate": "2026-07-10T10:45:00-06:00",
    "title": "daily-am",
    "updatedAt": "2026-07-10T16:27:03.116Z",
    "user": "69a788b45950587a342ace20"
}

tip: investigate the logs when doing recurring events with a connected account (Chrome) or just look at the staging logs now (since the bug is in main)

### problem 2: recurrence changes are not rendering optimistically

goal: whenever a user makes a change to a recurring event as a draft, the full effect of the change should be visible

- for example if they create a daily event from 8am-9am and are on the week view with 7 days, they should that daily event previewing on every day of that week. If the user then ESC or cancels the draft, all of those drafts disappear (no server request)

solution: we need a better mechanism to quickly preview and discard and adjust drafts for recurring events

- we cannot rely on waiting for the API to respond before rendering the event
