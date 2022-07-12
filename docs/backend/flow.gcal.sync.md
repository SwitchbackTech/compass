# How Compass <-> GCal sync works

[GCal Sync Guide](https://developers.google.com/calendar/api/guides/sync)
[Push guide](https://developers.google.com/calendar/api/guides/push)

### Ids

There are a lot of ids involved in this process.
Here's the breakdown for reference:

- `calendarId`: the user's calendar.
  - default is `primary`
  - you can find the others using Gcal's `calendarList.list` API
- `resourceId`: created by GCal to refer to a user's calendar (eg their primary calendar)
  - `resourceId` looks like: `_erSB7UuK4_7Uy3CibSlcMLPwMg`
- `channelId`: a unique id created by Compass to track the watch channel

## Part I: One-time sync

Get all users calendar events

- use [pagination](https://developers.google.com/calendar/api/guides/pagination) if needed
- persist the `nextSyncToken` for future on-going syncs

## Part II: On-going Sync

TL;DR Google notifies you when something changes, then you do an incremental sync

### Setup a notification channel

One for each resource (eg 'primary' calendar)

- Each notification channel is associated both with a particular user and a particular resource (or set of resources)

How:
`POST` to the user's primary calendar's `/watch` endpoint

- provide uuid and a webhook URL (eg `https://***REMOVED***/app/notifications`) - webhook needs to be open to google at minimum (if not public) - optionally include your own `expiration`, which might ease renewals
  Google creates a notification channel with that info and returns a `resourceId` and `expiration`
  Google also sends a `sync` message to confirm it worked
- which also contains an `expiration` time
  When the calendar events change, Google sends a `POST` to your webhook
- `sync`, `exists`, `not_exists`
  Compass initiates an incremental sync on the user's calendar (using your persisted `nextSyncToken`)

## Handling Notifications

Keep the channel active

- Keep track of when it expires
- Before it does, `POST` another `/watch`
  - Use a new uuid

### Sync Scenarios:

- This explains how syncing is currently being handled; there is definitely a more efficient way to do it

User **imports** their Gcal events:

1. Compass maps gcal to compass event structure, adding an `origin` property
   that indicates the event originally came via import
2. Compass creates its own copies of the events in bulk

User **creates/edits** event in **Gcal:**

1. Gcal notifies Compass
2. Compass does incremental sync

User **creates/edits** event in **Compass**:

1. Compass immediately updates its own DB and edits GCal event

- For new events:
  - compass updates the event's `origin` to indicate that it came from compass
  - compass saves the origin in the Gcal event's `extendedProperties`

2. some time passes

3. Gcal notifies Compass about event changes

4. Compass calls GCal's API to get the updated events

5. Compass updates its DB with the response from GCal API

- It does not attempt to filter out the events that it already updated based on `origin`, because doing so breaks when the user updates an event that was created in Compass and updated in GCal
  - This is because the event will have `origin` of `compass`, but be changed in GCal, and thus should be synced. So, simply excluding those events unfortunately doesn't work

User **deletes** event in **Compass**:

1.-4.: same as above

5. Compass attempts to remove the event from its DB (for a second time)

- This duplication is because the payload from Gcal's notification doesn't contain enough info to allow Compass to know if it already deleted the event in its DB or not (ie it doesn't contain `extendedProperties.origin` data). So to be safe, Compass tries to delete it again.
