# How Compass <-> GCal sync works

[GCal Sync Guide](https://developers.google.com/calendar/api/guides/sync)
[Push guide](https://developers.google.com/calendar/api/guides/push)

## Part I: One-time sync

Get all users calendar events

- use [pagination](https://developers.google.com/calendar/api/guides/pagination) if needed
- persist the `nextSyncToken` for future on-going syncs


## Part II: On-going Sync 
TL;DR Google notifies you when something changes, then you do an incremental sync
### Setup a notification channel
One for each resource (eg 'primary' calendar)
- Each notification channel is associated both with a particular user and a particular resource (or set of resources)
- the `channelId` is created by Compass 
- the `resourceId` is created by GCal to refer to a user's calendar (eg their primary calendar)
  - the `resourceId` looks like: `_erSB7UuK4_7Uy3CibSlcMLPwMg"`

How: 
`POST` to the user's primary calendar's `/watch` endpoint
  - provide uuid and a webhook URL (eg `https://***REMOVED***/app/notifications`)
    - webhook needs to be open to google at minimum (if not public)
    - optionally include your own `expiration`, which might ease renewals
Google creates a notification channel with that info and returns a `resourceId` and `expiration`
Google also sends a `sync` message to confirm it worked
  - which also contains an `expiration` time
When the calendar events change, Google sends a `POST` to your webhook
  - `sync`, `exists`, `not_exists` 
Compass initiates an incremental sync on the user's calendar (using your persisted `nextSyncToken`)

Keep the channel active 
  - Keep track of when it expires
  - Before it does, `POST` another `/watch` 
    - Use a new uuid



