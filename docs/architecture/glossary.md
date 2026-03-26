# Glossary

Definition of terms used in the source code and documentation.

## Events

**Standalone Event**: An event that has a datetime and is NOT recurring. It represents a single occurrence.

**Grid Event**: An event that is assigned to a specific time slot on the calendar in the grid view. These events have both a date and time.

**Draft Event**: A calendar event that has pending changes that have not yet been persisted to the database. When a user makes changes to an event in the form, drags the event or resizes its times, the user is operating on a draft event. After the user clicks "Save", the draft event is persisted to the database, and the Draft Event goes away and is replaced with the Event.

**Someday Event**: These have `startDate` and `endDate` like regular timed events, but they have not yet been assigned to a specific time slot on the calendar in the grid. Instead, they are stored in the sidebar (Someday/Maybe list). These may be recurring or standalone.

**Base Event**: A _recurring_ event that defines the recurrence pattern. It has the series `RRULE` in the `recurrence` field and serves as a template for generating instances.

**Instance Event**: A _recurring_ event that is an individual occurrence of a base event. Instances are generated based on the base event's recurrence rule.

## Calendar Concepts

**Calendar**: A calendar is a collection of events. It is the main object in the application. In Compass, each user has their primary calendar.

**Calendar List**: Also known as sub-calendars. A calendar list is a collection of calendars. In Google Calendar, users can have multiple calendars (e.g., "Work", "Personal", "Holidays").

**Calendar View**: A calendar view is a way to view a calendar. Compass supports:

- Day view
- Week view
- Month view
- Now mode (focus on current task)

**Primary Calendar**: The main calendar associated with a user's Google account. Compass currently syncs only the primary calendar.

## Sync & Authentication

**Sync**: The Compass feature that allows users to sync their calendar data with other calendars like Google Calendar. Sync can be bidirectional (changes in Compass update Google Calendar and vice versa).

**Sync Channel**: A notification channel set up with Google Calendar that notifies Compass when events change. Managed via Google Calendar's watch API.

**nextSyncToken**: A token provided by Google Calendar API that allows incremental syncing. It represents the state of the calendar at a point in time.

**gAccessToken**: Google OAuth access token used to authenticate API requests to Google Calendar.

**gRefreshToken**: Google OAuth refresh token used to obtain new access tokens when they expire. Stored securely in MongoDB.

## Technical Terms

**Redux Store**: The centralized state management store for the React frontend. Contains all application state including events, user data, and UI state.

**Redux Saga**: Middleware for Redux that handles side effects (API calls, async operations) in a declarative way.

**Duck Pattern**: A Redux pattern that co-locates actions, reducers, and selectors in a single file (or directory) for a feature domain.

**WebSocket**: A communication protocol used for real-time bidirectional communication between the frontend and backend. Used to push updates when events change.

**Supertokens**: The authentication library used by Compass to manage user sessions, access tokens, and refresh tokens.

**MongoDB Collection**: A collection in MongoDB is similar to a table in a relational database. Compass uses collections for users, events, syncs, etc.
