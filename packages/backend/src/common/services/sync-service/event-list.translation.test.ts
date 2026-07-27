import { faker } from "@faker-js/faker";
import { EventSchema } from "@core/types/event.contracts";
import {
  type SyncEventInstance,
  SyncEventInstanceSchema,
} from "@core/types/sync/event.contracts";
import { syncEventInstanceToBrowser } from "./event-list.translation";
import { composeOccurrenceId } from "./occurrence-id";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

const baseInstance = (
  overrides: Partial<SyncEventInstance> = {},
): SyncEventInstance =>
  SyncEventInstanceSchema.parse({
    eventId: objectId(),
    calendarId: objectId(),
    content: { title: "Standup", description: "Daily" },
    schedule: {
      kind: "timed",
      start: "2026-07-14T09:00:00.000Z",
      end: "2026-07-14T09:30:00.000Z",
      timeZone: "UTC",
    },
    recurrence: { kind: "single" },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides,
  });

describe("syncEventInstanceToBrowser", () => {
  it("maps a single to Event with recurrence.kind=single and the real eventId", () => {
    const instance = baseInstance();
    const event = syncEventInstanceToBrowser(instance);

    expect(() => EventSchema.parse(event)).not.toThrow();
    expect(event.id).toBe(instance.eventId);
    expect(event.recurrence).toEqual({ kind: "single" });
    expect(event.content).toEqual({
      kind: "details",
      title: "Standup",
      description: "Daily",
    });
    expect(event.calendarId).toBe(instance.calendarId);
  });

  it("maps a series master row keeping the real eventId and rules", () => {
    const instance = baseInstance({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const event = syncEventInstanceToBrowser(instance);

    expect(event.id).toBe(instance.eventId);
    expect(event.recurrence).toEqual({
      kind: "series",
      rules: ["RRULE:FREQ=WEEKLY"],
    });
  });

  it("composes an occurrence id and sets seriesId to the owning eventId", () => {
    const eventId = objectId();
    const recurrenceId = "2026-07-14T09:00:00.000Z";
    const instance = baseInstance({
      eventId,
      recurrence: { kind: "occurrence", recurrenceId },
    });
    const event = syncEventInstanceToBrowser(instance);

    expect(event.id).toBe(composeOccurrenceId({ eventId, recurrenceId }));
    expect(event.recurrence).toEqual({ kind: "occurrence", seriesId: eventId });
  });

  it("passes schedule and timestamps through", () => {
    const instance = baseInstance({
      schedule: {
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-15",
      },
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-02T12:00:00.000Z",
    });
    const event = syncEventInstanceToBrowser(instance);

    expect(event.schedule).toEqual(instance.schedule);
    expect(event.createdAt).toBe(instance.createdAt);
    expect(event.updatedAt).toBe(instance.updatedAt);
  });

  it("forwards content.color onto browser details content", () => {
    const instance = baseInstance({
      content: { title: "Standup", description: "Daily", color: "blue" },
    });
    const event = syncEventInstanceToBrowser(instance);

    expect(event.content).toEqual({
      kind: "details",
      title: "Standup",
      description: "Daily",
      color: "blue",
    });
  });

  it("omits content.color on the browser event when sync has none", () => {
    const event = syncEventInstanceToBrowser(baseInstance());

    expect(event.content).not.toHaveProperty("color");
  });
});
