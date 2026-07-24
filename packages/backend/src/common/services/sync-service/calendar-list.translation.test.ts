import { faker } from "@faker-js/faker";
import { getCalendarCapabilities } from "@core/types/calendar.contracts";
import {
  type ProviderCalendar,
  ProviderCalendarSchema,
} from "@core/types/sync/connection.contracts";
import { syncCalendarToBrowser } from "./calendar-list.translation";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

const providerCalendar = (
  overrides: Partial<ProviderCalendar> = {},
): ProviderCalendar =>
  ProviderCalendarSchema.parse({
    id: objectId(),
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    providerCalendarId: "primary@group.calendar.google.com",
    displayName: "Work",
    color: "#33b679",
    active: true,
    primary: false,
    accessRole: "owner",
    capabilities: {
      canReadEvents: true,
      canWriteEvents: true,
      canReadBusy: true,
      canInviteAttendees: true,
    },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides,
  });

describe("syncCalendarToBrowser", () => {
  it("uses the sync calendar id directly as the browser calendar id", () => {
    const calendar = providerCalendar();
    // Option 2: calendars are sync-owned, so no id bridge — the browser uses
    // sync's id verbatim.
    expect(syncCalendarToBrowser(calendar).id).toBe(calendar.id);
  });

  it("maps display name, primary, and active through", () => {
    const result = syncCalendarToBrowser(
      providerCalendar({
        displayName: "Personal",
        primary: true,
        active: false,
      }),
    );
    expect(result.name).toBe("Personal");
    expect(result.isPrimary).toBe(true);
    expect(result.isActive).toBe(false);
  });

  it("puts the provider colour on the background and defaults the foreground", () => {
    const result = syncCalendarToBrowser(
      providerCalendar({ color: "#4285f4" }),
    );
    expect(result.backgroundColor).toBe("#4285f4");
    expect(result.foregroundColor).toBe("#000000");
  });

  it("falls back to the legacy default colour when the provider omits one", () => {
    const result = syncCalendarToBrowser(providerCalendar({ color: null }));
    expect(result.backgroundColor).toBe("#9e9e9e");
  });

  it("always reports the calendar visible (visibility is client-side now)", () => {
    const result = syncCalendarToBrowser(providerCalendar({ active: false }));
    expect(result.isVisible).toBe(true);
  });

  it("leaves description empty and timeZone null (sync stores neither)", () => {
    const result = syncCalendarToBrowser(providerCalendar());
    expect(result.description).toBe("");
    expect(result.timeZone).toBeNull();
  });

  it.each([
    ["owner", "owner"],
    ["editor", "writer"],
    ["viewer", "reader"],
    ["busyOnly", "freeBusyReader"],
  ] as const)("maps sync access role %s to browser access %s and derives capabilities", (syncRole, browserAccess) => {
    const result = syncCalendarToBrowser(
      providerCalendar({ accessRole: syncRole }),
    );
    expect(result.access).toBe(browserAccess);
    // Capabilities are derived from the access role, matching the legacy mapper.
    expect(result.capabilities).toEqual(getCalendarCapabilities(browserAccess));
  });
});
