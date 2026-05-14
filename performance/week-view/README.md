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
