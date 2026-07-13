# Recurring Event Edit UX

Implementation plan for making recurring-event edits feel immediate while preserving backend and provider correctness.

## Delivery order

1. [Characterize latency](./01-characterize-recurring-edit-latency.md)
2. [Fix canonical stale-series behavior](./02-fix-canonical-stale-series-behavior.md)
3. [Build the optimistic projection](./03-optimistic-recurrence-projection.md)
4. [Optimistically update shared fields](./04-optimistic-shared-field-edits.md)
5. [Optimistically update time](./05-optimistic-time-edits.md)
6. [Optimistically update recurrence rules](./06-optimistic-recurrence-rule-edits.md)
7. [Harden convergence and concurrency](./07-harden-convergence-and-concurrency.md)
8. [Complete day-view support](./08-day-view-recurring-edits.md)
9. [Add the repeat indicator](./09-repeat-indicator.md)

Slices 1–3 establish the behavioral contract and architecture. Slices 4–6 add capability incrementally. Slice 7 hardens the complete mutation lifecycle. Slices 8–9 complete the user-facing experience.

## Architectural constraints

- Day/week query results contain recurring instances, not recurring base events. `readAll` hydrates each instance with the base ID and rule.
- TanStack Query owns persisted event state. Do not introduce a second event store.
- Keep one pure recurrence projection and one TanStack Query adapter. Do not reproduce `CompassEventFactory` in the browser.
- Apply a projection atomically per query entry so old and replacement occurrences never render together between cache writes.
- Preserve real instance IDs whenever occurrence matching is unambiguous. Use temporary IDs only for genuinely new projected occurrences.
- Refetch and SSE remain the authority for canonical IDs and provider state.

## Project-wide definition of done

- The visible day/week calendar changes before the repository promise resolves.
- All cached ranges for the active source receive the same logical projection.
- Successful writes converge to canonical backend state without visible duplicates.
- Failed writes converge back to backend state and report the existing error.
- Focus, selection, and the active draft survive optimistic updates.
- Focused web/backend tests, `bun type-check`, and `bun lint` pass.

