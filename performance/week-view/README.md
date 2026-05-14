# Week View Performance Tracking

Use this when making week-grid changes and you want a before-and-after record
for each step.

## Baseline

Run this before applying a grid change:

```bash
bun run perf:week -- --label baseline --note "before grid changes"
```

The command writes JSON results under `tmp/perf/week-view/` and updates
`tmp/perf/week-view/latest.json`. The `tmp/` folder is ignored by git, so the
numbers stay local unless you intentionally copy a result somewhere else.

## Compare The Next Change

After making a focused change, run:

```bash
bun run perf:week -- --label colocate-date-calcs --compare latest --note "moved date calcs closer to the grid"
```

`--compare latest` reads the previous run before saving the new one, so the
printed table shows before, after, and percent change. The saved JSON also keeps
that comparison under `comparison`, and `history.jsonl` gets a compact copy.
The new run then becomes the next `latest` baseline.

`latest` is intentionally strict. It only compares when the branch, sample
count, browser mode, viewport, scenario set, and seeded week match. If you want
to compare across one of those boundaries, pass the saved JSON path explicitly.

## What It Measures

The harness runs the same seeded browser flows each time:

- input baseline, which records the browser/input frame floor for V2 comparisons
- empty week view load
- heavy week view load with overlapping timed events and all-day events
- timed event creation through the app shortcut and real form save
- timed event creation from the grid and real form save
- timed event drag through the real grid interaction, verified by visible movement
- timed event resize through the real grid interaction, verified by visible size change
- timed-drag V2 proof-slice scenarios:
  - unchanged click
  - first visual frame
  - sustained drag motion
  - pointerup commit
- timed-resize V2 scenarios:
  - bottom-edge sustained resize
  - top-edge sustained resize
  - edge-flip resize
- all-day V2 scenarios:
  - sustained drag motion
  - sustained resize motion
- smart-scroll V2 timed drag
- edge-navigation V2 timed drag

Each scenario runs several samples and reports median time, p95 time, worst
frame gap, and long-task count.

When the Week interaction V2 controller exposes
`window.__weekInteractionMetrics`, the saved JSON and console output also record
the ownership counters for React commits, Redux dispatches, unexpected DOM
mutations, layout reads, RAF compute/write time, first-frame latency, and save
requests during and after pointer motion. Before V2 is enabled those counters
print as unavailable, which is expected for the measurement-guard phase.

## Useful Options

```bash
# Fewer samples for a quick smoke test
bun run perf:week -- --runs 1 --warmups 0 --label smoke

# Run one scenario
bun run perf:week -- --scenario heavy-week-load --label heavy-baseline

# Compare with a specific saved result
bun run perf:week -- --compare tmp/perf/week-view/2026-...-baseline.json --label next-change

# Use an already running app server
bun run perf:week -- --base-url http://localhost:9080 --label local-server
```

By default, each scenario gets one warmup sample that is discarded. Use
`--warmups 0` only for quick smoke checks.

Use the same machine and avoid background-heavy work when comparing runs.

## Controller V2 Runs

- 2026-05-14, `v2-input-floor`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T17-51-18-806Z-v2-input-floor.json`
  recorded the Task 1 input floor. `input-baseline` reported a 14.3 ms max
  frame gap and 0 long tasks. V2 ownership counters were unavailable, as
  expected before the controller is enabled.
- 2026-05-14, `v2-event-registry`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T17-54-30-893Z-v2-event-registry.json`
  recorded Task 2 after adding the Week event registry and stable event
  attributes. `input-baseline` reported a 14.3 ms max frame gap and 0 long
  tasks. Compared with `v2-input-floor`, the median changed from 407.4 ms to
  420.1 ms.
- 2026-05-14, `v2-passive-boundary`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T17-57-52-508Z-v2-passive-boundary.json`
  recorded Task 3 after adding the passive Week interaction boundary.
  `--compare latest` was refused because `latest` used only `input-baseline`,
  so the run used the explicit `v2-event-registry` JSON path as instructed.
  `drag-timed-event` reported a 14.3 ms max frame gap and 0 long tasks;
  `resize-timed-event` reported a 15.4 ms max frame gap and 0 long tasks. V2
  ownership counters were unavailable because the passive controller still
  refuses ownership.
- 2026-05-14, `v2-pending-timed-drag`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-04-39-793Z-v2-pending-timed-drag.json`
  recorded Task 4 after adding the pending timed-drag controller internals.
  The default boundary still remained passive, so live Week behavior stayed on
  the legacy path. Compared with `v2-passive-boundary`, `drag-timed-event`
  median changed from 453.5 ms to 456.0 ms with a 14.3 ms max frame gap and 0
  long tasks; `resize-timed-event` median changed from 397.6 ms to 387.7 ms
  with a 15.2 ms max frame gap and 0 long tasks.
- 2026-05-14, `v2-timed-drag-overlay`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-12-07-144Z-v2-timed-drag-overlay.json`
  was the first Task 5 hard-gate run. It proved the overlay appeared after the
  proof flag was moved after page reload, but `timed-drag-v2-sustained`
  recorded intermittent React/Redux work during motion, so it did not pass the
  ownership counter gate.
- 2026-05-14, `v2-timed-drag-overlay-rerun`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-14-34-627Z-v2-timed-drag-overlay-rerun.json`
  is the passing Task 5 hard-gate rerun. `input-baseline` reported a 15.3 ms
  max frame gap. `timed-drag-v2-sustained` reported a 15.4 ms max frame gap,
  0 long tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save
  requests 0, RAF p95 0.1 ms, and RAF max 0.5 ms.
- 2026-05-14, `v2-timed-drag-commit`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-22-13-315Z-v2-timed-drag-commit.json`
  recorded Task 6 after routing unchanged clicks and moved timed drags through
  the V2 pointer-up adapter. `--compare latest` was refused because `latest`
  used the Task 5 scenario shape, so the run used the explicit
  `v2-timed-drag-overlay-rerun` JSON path. `timed-drag-v2-click-unchanged`
  reported React 0, Redux 0, unexpected DOM 0, layout reads 0, and save 0/0.
  `timed-drag-v2-pointerup-commit` reported a 26.6 ms max frame gap, 0 long
  tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save 0/1, RAF p95
  0.2 ms, and RAF max 0.2 ms.
- 2026-05-14, `v2-legacy-fallbacks`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-26-22-895Z-v2-legacy-fallbacks.json`
  recorded Task 7 after adding explicit fallback guards for edge-navigation
  and smart-scroll candidates. The run compared cleanly with
  `v2-timed-drag-commit`. `timed-drag-v2-click-unchanged` stayed at React 0,
  Redux 0, unexpected DOM 0, layout reads 0, and save 0/0.
  `timed-drag-v2-pointerup-commit` reported a 26.1 ms max frame gap, 0 long
  tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save 0/1, RAF p95
  0.2 ms, and RAF max 0.2 ms.
- 2026-05-14, `v2-form-open-drag`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-31-16-229Z-v2-form-open-drag.json`
  was the first Task 8 run after form-open drag support. `--compare latest`
  was refused because `latest` used the Task 7 scenario shape, so the run used
  the explicit `v2-legacy-fallbacks` JSON path. The run did not pass ownership
  counters because `timed-drag-v2-sustained` recorded intermittent
  `auth/resetAuth` and `userMetadata/clear` dispatches during motion.
- 2026-05-14, `v2-form-open-drag-rerun`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-33-25-229Z-v2-form-open-drag-rerun.json`
  is the passing Task 8 rerun after the perf harness started the app with the
  existing e2e session-check flag. `timed-drag-v2-sustained` reported a 15.4 ms
  max frame gap, 0 long tasks, React 0, Redux 0, unexpected DOM 0, layout reads
  0, save 0/0, RAF p95 0.1 ms, and RAF max 0.2 ms.
  `timed-drag-v2-pointerup-commit` reported a 15.3 ms max frame gap, 0 long
  tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save 0/1, RAF p95
  0.2 ms, and RAF max 0.2 ms.
- 2026-05-14, `v2-recurring-timed-drag-adapter`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-37-44-867Z-v2-recurring-timed-drag-adapter.json`
  was the first Task 9 run after routing recurring timed drags through the
  recurrence-scope adapter. `timed-drag-v2-sustained` stayed clean, but one
  `timed-drag-v2-pointerup-commit` sample recorded React 2 with Redux 0 during
  motion, so the run did not pass the ownership counter gate.
- 2026-05-14, `v2-recurring-timed-drag-adapter-rerun`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-39-12-938Z-v2-recurring-timed-drag-adapter-rerun.json`
  is the passing Task 9 rerun. `timed-drag-v2-sustained` reported a 15.4 ms
  max frame gap, 0 long tasks, React 0, Redux 0, unexpected DOM 0, layout reads
  0, save 0/0, RAF p95 0.1 ms, and RAF max 0.2 ms.
  `timed-drag-v2-pointerup-commit` reported a 15.4 ms max frame gap, 0 long
  tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save 0/1, RAF p95
  0.2 ms, and RAF max 0.2 ms.
- 2026-05-14, `v2-timed-resize`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-46-59-672Z-v2-timed-resize.json`
  recorded Task 10 after moving timed resize through the V2 controller.
  `--compare latest` was refused because `latest` used the Task 9 scenario
  shape, so the run used the explicit `v2-recurring-timed-drag-adapter-rerun`
  JSON path. `input-baseline` reported a 15.3 ms max frame gap. Bottom-edge,
  top-edge, and edge-flip resize each reported a 15.4 ms max frame gap, 0 long
  tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, and save 0/0.
  RAF p95/max were 0.1/0.2 ms for bottom resize, 0.2/0.3 ms for top resize,
  and 0.1/0.2 ms for edge flip.
- 2026-05-14, `v2-all-day-drag`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T18-53-25-803Z-v2-all-day-drag.json`
  recorded Task 11 after moving all-day drag through the V2 controller.
  `--compare latest` was refused because `latest` used the Task 10 scenario
  shape, so the run used the explicit `v2-timed-resize` JSON path.
  `all-day-drag-v2-sustained` reported a 14.4 ms max frame gap, 0 long tasks,
  React 0, Redux 0, unexpected DOM 0, layout reads 0, save 0/0, RAF p95
  0.1 ms, and RAF max 0.3 ms.
- 2026-05-14, `v2-all-day-resize`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T19-04-34-617Z-v2-all-day-resize.json`
  was the first Task 12 run after moving all-day resize through the V2
  controller. `--compare latest` was refused because `latest` used the Task 11
  scenario shape, so the run used the explicit `v2-all-day-drag` JSON path.
  The run did not pass because `all-day-resize-v2-sustained` recorded
  intermittent React commits during motion.
- 2026-05-14, `v2-all-day-resize-fixed`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T19-07-30-634Z-v2-all-day-resize-fixed.json`
  was the rerun after suppressing the legacy resize `mousedown`. It still did
  not pass because some legacy `mousemove` listeners could update React state
  during the V2-owned motion session.
- 2026-05-14, `v2-all-day-resize-suppressed-mousemove`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T19-09-23-301Z-v2-all-day-resize-suppressed-mousemove.json`
  is the passing Task 12 run after suppressing legacy mouse events while V2
  owns the session. `all-day-resize-v2-sustained` reported a 14.4 ms max frame
  gap, 0 long tasks, React 0, Redux 0, unexpected DOM 0, layout reads 0, save
  0/0, RAF p95 0.1 ms, and RAF max 0.3 ms.
- 2026-05-14, `v2-smart-scroll`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T19-16-47-448Z-v2-smart-scroll.json`
  recorded Task 13 after moving timed-drag smart scroll into the V2 controller
  RAF loop. `--compare latest` was refused because `latest` used the Task 12
  scenario shape, so the run used the explicit
  `v2-all-day-resize-suppressed-mousemove` JSON path. `smart-scroll-drag-v2`
  reported a 14.4 ms max frame gap, 0 long tasks, React 0, Redux 0, unexpected
  DOM 0, layout reads 0, save 0/0, RAF p95 0.2 ms, and RAF max 0.3 ms.
- 2026-05-14, `v2-edge-navigation`:
  `/Users/ugur/Projects/switchback-tech/compass2/tmp/perf/week-view/2026-05-14T19-26-13-275Z-v2-edge-navigation.json`
  recorded Task 14 after moving drag-to-edge dwell into the V2 controller.
  `--compare latest` was refused because `latest` used the Task 13 scenario
  shape, so the run used the explicit `v2-smart-scroll` JSON path.
  `edge-navigation-drag-v2` reported a 14.5 ms max frame gap, 0 long tasks,
  layout reads 0, save 0/0, RAF p95 0.2 ms, and RAF max 0.6 ms. The React,
  Redux, and DOM counters are non-zero in this scenario because the controller
  intentionally requests one React-owned week change during the active drag.
