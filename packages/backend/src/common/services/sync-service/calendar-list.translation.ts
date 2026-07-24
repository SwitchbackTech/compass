import {
  type Calendar,
  type CalendarAccess,
  CalendarSchema,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { type ProviderCalendar } from "@core/types/sync/connection.contracts";

// Legacy's default calendar colours (map.calendar.ts), reused so a sync-served
// calendar looks identical to a legacy one when the provider omits a colour.
const DEFAULT_BACKGROUND = "#9e9e9e";
const DEFAULT_FOREGROUND = "#000000";

// Sync reports the provider's access role in its own vocabulary; the browser
// Calendar uses the legacy Google-derived enum. Exhaustive, no default, so a new
// role fails the build rather than silently mapping to something permissive.
const mapCalendarAccessRole = (
  role: ProviderCalendar["accessRole"],
): CalendarAccess => {
  switch (role) {
    case "owner":
      return "owner";
    case "editor":
      return "writer";
    case "viewer":
      return "reader";
    case "busyOnly":
      return "freeBusyReader";
  }
};

// Translate one sync ProviderCalendar into the browser Calendar contract. Under
// sync-owned calendars (S39 option 2), the browser uses sync's calendar id
// directly, so no id bridge is needed. Capabilities are DERIVED from the access
// role via the same helper the legacy mapper uses, sidestepping the difference
// between sync's and the browser's capability shapes.
//
// Deliberate v1 gaps, all contract-valid: description is empty and timeZone is
// null (sync's provider_calendars stores neither), the single provider colour
// becomes the background (foreground defaults), and isVisible is always true —
// visibility is owned client-side now, so the server reports every calendar
// visible and the web applies its own hidden set.
export const syncCalendarToBrowser = (calendar: ProviderCalendar): Calendar => {
  const access = mapCalendarAccessRole(calendar.accessRole);
  return CalendarSchema.parse({
    id: calendar.id,
    name: calendar.displayName,
    description: "",
    timeZone: null,
    foregroundColor: DEFAULT_FOREGROUND,
    backgroundColor: calendar.color ?? DEFAULT_BACKGROUND,
    provider: "google",
    access,
    capabilities: getCalendarCapabilities(access),
    isPrimary: calendar.primary,
    isVisible: true,
    isActive: calendar.active,
  });
};
