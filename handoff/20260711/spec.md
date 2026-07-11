# July 10, 2026

## [ ] fix(web): time picker input selection

reference the 'time-picker-input' dir for images

### bug1: timepicker input list stays open

- expected 1: when a user has the time picker in the normal grid event form open and then clicks out, then the time picker input list closes
- actual: when the user clicks out, the time picker stays open

### bug 2: default time for second time picker is incorrect

- expected: the time picker for a form renders with the current value in-view
- actual: when a user opens the startime picker and then clicks the end input, the end input time is incorrect
