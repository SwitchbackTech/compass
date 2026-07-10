# Someday tasks

Ignore these tasks for now, I'm still grooming them.

## After schema changes

### [ ] fix(web): fix order when using keyboard to reorder someday events

Problem: When a user focuses on a someday event and then moves it to the This Week / This Month list with the SHIFT + arrow sequence, it doesn't honor the positioning of the other events in the list. For example, if the This Week list had events called A, B, C, D and there was an E event in the This Month list and the user used SHIFT + ARROW up, the E event would initially go to the top of the This Week List (E, A, B, C, D) and then once the API request failed it would go to the bottom (A, B, C, D, E).

Solution: The event order should always be preserved, regardless of how it was moved or when the API request succeeds or not.

Open questions:

- How can we preserve this functionality for users so that no matter what device they use, their order is always preserved...without polluting the event schema with UI specific things like ordering? An event shouldn't need an order to exist in the DB, since order is only relative to other events, and an event should be its own standalone thing according to the API. We shouldn't mix UI stuff with data stuff. But we also don't want to add a bunch of extra stuff to the DB just for these scenarios. We need a solution that finds a good tradeoff between UX and simplicity.
