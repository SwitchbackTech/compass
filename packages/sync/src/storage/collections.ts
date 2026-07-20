// Collection names for the isolated `compass_sync` database (ledger S11).
// One document per connection, calendar, event, occurrence, resource, command,
// job, and deletion marker — never growing per-user arrays (01-domain-model.md
// "Collections and essential indexes"). Repositories for these land in S12-S14;
// S11 owns the bootstrap that creates them with their indexes.
export const SYNC_COLLECTIONS = {
  providerConnections: "provider_connections",
  providerCalendars: "provider_calendars",
  events: "events",
  eventOccurrences: "event_occurrences",
  syncResources: "sync_resources",
  commands: "commands",
  jobs: "jobs",
  deletionMarkers: "deletion_markers",
} as const;

export type SyncCollectionName =
  (typeof SYNC_COLLECTIONS)[keyof typeof SYNC_COLLECTIONS];
