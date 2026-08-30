# Cursor Automation: booking-loop pickup

One-time setup so a Cloud Agent starts when GitHub Actions comments
`booking-loop: pickup` on a Booking v1 issue.

Skip this file if the repo secret `CURSOR_API_KEY` is set. The launch
script then uses `POST https://api.cursor.com/v0/agents` and **must not**
comment the pickup phrase (dual-launch rule).

## Create the Automation

In Cursor Dashboard → Automations (or Cloud Agents → Automations):

1. **Name:** `booking-loop`
2. **Repository:** `KeepSoftwareSimple/compass-calendar`
3. **Trigger:** GitHub issue comment
4. **Match:** comment body contains exactly `booking-loop: pickup`
5. **Prompt:** paste the contents of
   [`.github/prompts/booking-loop.md`](../../.github/prompts/booking-loop.md)
   (or: `Read .github/prompts/booking-loop.md and follow it exactly. The
   triggering issue is the target WP.`)
6. **Environment:** this repo's Cloud Agent environment (same as manual
   cloud agents).
7. Enable the automation.

The GitHub Action still owns pick-next, merge-guard, and staging smoke.
The Automation only starts the implementer for the issue that received
the comment.

## Verify

1. Leave `BOOKING_LOOP_ENABLED` off. Comment `booking-loop: pickup` on
   [#2970](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2970)
   and confirm an agent starts, then stop it.
2. Flip `BOOKING_LOOP_ENABLED` to `true` and dispatch **Booking loop**
   with no issue number. The Action should comment the pickup phrase on
   the lowest eligible WP and the Automation should start.

## Dual-launch

If you later add `CURSOR_API_KEY`, disable this Automation or you will
get two agents when someone comments the phrase by hand. The Action
will stop commenting the phrase once the key exists.
