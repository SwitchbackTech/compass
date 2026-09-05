import { type SyncCalendarCapabilities } from "@core/types/sync/connection.contracts";

// Per-calendar operational capabilities for a discovered Microsoft calendar.
// Push subscriptions are a connection-level fact (changeNotifications); every
// listed calendar can be watched when the connection grants calendar access.
export function microsoftDiscoveredCalendarCapabilities(
  canEdit: boolean,
): SyncCalendarCapabilities {
  return {
    canReadEvents: true,
    canWriteEvents: canEdit,
    canReadBusy: true,
    canInviteAttendees: canEdit,
  };
}
