import { AxiosResponse } from "axios";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { setupDraftState } from "@web/__tests__/utils/grid.util/draft.util";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { EventApi } from "@web/ducks/events/event.api";

describe("isEventDirty", () => {
  beforeEach(() => jest.resetAllMocks());

  jest.spyOn(EventApi, "get").mockImplementation(() =>
    Promise.resolve({
      data: [],
      status: 200,
    } as unknown as AxiosResponse<Schema_Event[]>),
  );

  const { isEventDirty, draft } = setupDraftState(
    createMockStandaloneEvent({
      priority: Priorities.SELF,
    }) as Schema_WebEvent,
  );

  it("should detect unchanged event as not dirty", () => {
    expect(isEventDirty(draft)).toBe(false);
  });

  it("should detect changed title as dirty", () => {
    const changed = { ...draft, title: "New Title" };
    expect(isEventDirty(changed)).toBe(true);
  });

  it("should detect changed description as dirty", () => {
    const changed = { ...draft, description: "Updated description" };
    expect(isEventDirty(changed)).toBe(true);
  });

  it("should detect changed startDate as dirty", () => {
    const changed = { ...draft, startDate: "2024-01-01T12:00:00.000Z" };
    expect(isEventDirty(changed)).toBe(true);
  });

  it("should detect changed endDate as dirty", () => {
    const changed = { ...draft, endDate: "2024-01-01T13:00:00.000Z" };
    expect(isEventDirty(changed)).toBe(true);
  });

  it("should detect changed priority as dirty", () => {
    const changed = { ...draft, priority: Priorities.RELATIONS };
    expect(isEventDirty(changed)).toBe(true);
  });

  it("should detect changed recurrence as dirty", () => {
    const changed = {
      ...draft,
      recurrence: { rule: ["FREQ=WEEKLY;BYDAY=MO"], eventId: "rec-id" },
    };
    expect(isEventDirty(changed)).toBe(true);
  });
});
