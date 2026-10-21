import { QueryClient } from "@tanstack/react-query";
import { EventIdSchema } from "@core/types/domain-primitives";
import { createMockCalendar } from "@web/__tests__/utils/factories/calendar.factory";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import {
  calendarIdFromMutationInput,
  resolveMutationProvider,
} from "@web/events/mutations/mutation-provider.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { describe, expect, it } from "bun:test";

const googleCalendar = createMockCalendar({
  name: "Work",
  provider: "google",
});
const calendarId = googleCalendar.id;
const eventId = EventIdSchema.parse("507f1f77bcf86cd799439012");

describe("calendarIdFromMutationInput", () => {
  it("reads a string calendarId from a mutation input", () => {
    expect(calendarIdFromMutationInput({ calendarId })).toBe(calendarId);
  });

  it("ignores missing or non-string calendar ids", () => {
    expect(calendarIdFromMutationInput(undefined)).toBeUndefined();
    expect(calendarIdFromMutationInput({ title: "Standup" })).toBeUndefined();
    expect(calendarIdFromMutationInput({ calendarId: 12 })).toBeUndefined();
  });
});

describe("resolveMutationProvider", () => {
  it("reads the provider from a create calendarId hint", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(calendarQueryKeys.all, [googleCalendar]);

    expect(
      resolveMutationProvider(queryClient, {
        writeKey: eventId,
        calendarId,
      }),
    ).toBe("google");
  });

  it("falls back to the cached event calendar when no hint is present", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(calendarQueryKeys.all, [googleCalendar]);
    const event = createMockEvent({
      id: eventId,
      calendarId,
      content: { kind: "details", title: "Standup", description: "" },
    });
    const weekKey = eventQueryKeys.week({
      source: "remote",
      start: "2026-07-01T00:00:00.000Z",
      end: "2026-07-08T00:00:00.000Z",
    });
    queryClient.setQueryData<NormalizedEventQueryData>(weekKey, {
      entities: { [eventId]: event },
      ids: [eventId],
    });

    expect(
      resolveMutationProvider(queryClient, {
        writeKey: eventId,
      }),
    ).toBe("google");
  });
});
