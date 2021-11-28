# How Compass <-> GCal sync works

[GCal Sync Guide](https://developers.google.com/calendar/api/guides/sync)

## One-time sync

Get all users calendar events

- use [pagination](https://developers.google.com/calendar/api/guides/pagination) if needed
- use [batching](https://developers.google.com/calendar/api/guides/batch) if needed
  - try getting it work without batching first
- persist the `nextSyncToken` for future on-going syncs

? Incrementally call list for date params (eg every month)
? How to find out how many events to get

## Ongoing sync - push notifications

[Push guide](https://developers.google.com/calendar/api/guides/push)

- Webhook
- Notification channel
- Watch route
- Renew the channel before it expires

Used to return only relevant (changed) results
If you want all events, then don't provide a sync token
