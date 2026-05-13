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
printed table shows before, after, and percent change. The new run then becomes
the next `latest` baseline.

## What It Measures

The harness runs the same seeded browser flows each time:

- empty week view load
- heavy week view load with overlapping timed events and all-day events
- timed event creation through the app shortcut and real form save
- timed event drag through the real grid interaction

Each scenario runs several samples and reports median time, p95 time, worst
frame gap, and long-task count.

## Useful Options

```bash
# Fewer samples for a quick smoke test
bun run perf:week -- --runs 1 --label smoke

# Run one scenario
bun run perf:week -- --scenario heavy-week-load --label heavy-baseline

# Compare with a specific saved result
bun run perf:week -- --compare tmp/perf/week-view/2026-...-baseline.json --label next-change

# Use an already running app server
bun run perf:week -- --base-url http://localhost:9080 --label local-server
```

Use the same machine, browser mode, and sample count when comparing runs.
