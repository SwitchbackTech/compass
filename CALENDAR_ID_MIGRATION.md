# Calendar ID Migration - Implementation Summary

## Overview

This migration adds a `calendarId` field to all Event documents, establishing a proper relationship between events and calendars in the Compass database. This enables:

- Multi-calendar support for users
- Better organization and filtering of events by calendar
- Foundation for future multi-provider calendar support

## Changes Made

### 1. Schema Updates

- **File**: `packages/core/src/types/event.types.ts`
- Added `calendarId?: string` field to `Schema_Event` interface
- Updated `CoreEventSchema` to include `calendarId: IDSchema.optional()`
- Updated `CompassCoreEventSchema` to include `calendarId: IDSchema.optional()`
- Made the field optional to support someday events (which don't belong to a specific calendar)

### 2. Data Migration

- **File**: `packages/scripts/src/migrations/2025.10.18T16.17.04.add-calendarId-to-events.ts`
- Migrates existing events to populate `calendarId` field
- For Google Calendar events (with `gEventId`): Links to the user's Google calendar
- For other events: Links to the user's primary calendar
- Skips someday events (as they don't belong to calendars)
- Includes transaction support for data safety
- **Test**: `packages/scripts/src/__tests__/integration/2025.10.18T16.17.04.add-calendarId-to-events.test.ts`

### 3. Database Indexes

- **File**: `packages/scripts/src/migrations/2025.10.18T16.17.05.add-calendarId-indexes.ts`
- Single index on `calendarId` for calendar-scoped queries
- Compound index on `user + calendarId` for user-calendar queries
- Compound index on `calendarId + startDate + endDate` for date-range queries
- All indexes created with `background: true` to minimize impact on running systems

### 4. Backend Service Updates

#### Sync Import Service

- **File**: `packages/backend/src/sync/services/import/sync.import.ts`
- Added `getCompassCalendarId()` helper to look up calendar ObjectID from Google calendar ID
- Updated `fetchAndCategorizeEventsToModify()` to add `calendarId` when importing events
- Updated `syncEvent()` to accept and use `gCalendarId` parameter
- Updated `importSeries()` to populate `calendarId` for base events and instances

#### Event Service

- **File**: `packages/backend/src/event/services/event.service.ts`
- Updated `_createCompassEvent()` to look up and set `calendarId` for non-someday Google Calendar events
- Retrieves the user's primary Google calendar when creating new events
- Propagates `calendarId` to recurring event instances

## Design Decisions

### 1. Optional Field

The `calendarId` field is optional because:

- Someday events in Compass don't belong to external calendars
- This maintains backward compatibility with existing code
- Allows for graceful handling of edge cases

### 2. Calendar Lookup Strategy

When syncing events from Google Calendar:

1. Look up the Compass calendar document by matching `metadata.id` (Google calendar ID)
2. Use that calendar's `_id` (ObjectID) as the `calendarId`
3. For new Compass events, use the user's primary calendar

### 3. Migration Approach

- Uses MongoDB transactions for data safety
- Processes events in batches (via cursor) to handle large datasets
- Provides detailed logging for visibility
- Supports rollback via the `down()` method

### 4. Index Strategy

Three indexes were created to optimize common query patterns:

- Calendar-scoped queries (e.g., "get all events for this calendar")
- User-calendar queries (e.g., "get all events for this user's calendar")
- Date-range calendar queries (e.g., "get events in date range for this calendar")

## Testing

- All existing tests pass (318 backend tests, 120 core tests, 47 scripts tests)
- New migration test verifies correct calendarId population
- No security vulnerabilities detected by CodeQL

## Migration Instructions

### Running the Migration

```bash
# Run the data migration
yarn cli migrate --up

# If needed, rollback
yarn cli migrate --down 2025.10.18T16.17.04.add-calendarId-to-events
```

### Verification

After running the migration:

1. Check that all non-someday events have a `calendarId`
2. Verify indexes are created: `db.event.getIndexes()`
3. Ensure events are properly linked to their calendars

## Impact Assessment

- **Breaking Changes**: None - the field is optional and backward compatible
- **Performance**: Minimal - indexes are created in background mode
- **Data Safety**: High - migration uses transactions and is fully reversible
- **Test Coverage**: Complete - all tests pass

## Future Work

- Consider making `calendarId` required for non-someday events after migration
- Add API endpoints to filter events by calendar
- Extend to support multiple calendar providers beyond Google
- Add calendar-scoped event queries in the UI
