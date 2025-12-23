import { addEntities } from "@ngneat/elf-entities";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import {
  activeEvent$,
  activeEventId$,
  allDayEvents$,
  draft$,
  eventsStore,
  resetActiveEvent,
  resetDraft,
  setActiveEvent,
  setDraft,
  timedEvents$,
  updateEvent,
} from "@web/store/events";

describe("events store", () => {
  const mockEvent1: WithCompassId<Schema_Event> = {
    _id: "1",
    title: "Event 1",
    startDate: "2023-01-01T10:00:00Z",
    endDate: "2023-01-01T11:00:00Z",
    isAllDay: false,
  };

  const mockEvent2: WithCompassId<Schema_Event> = {
    _id: "2",
    title: "Event 2",
    startDate: "2023-01-01T12:00:00Z",
    endDate: "2023-01-01T13:00:00Z",
    isAllDay: true,
  };

  beforeEach(() => {
    eventsStore.reset();
  });

  describe("Draft", () => {
    it("should set and reset draft", () => {
      let draft: WithCompassId<Schema_Event> | null = null;
      const sub = draft$.subscribe((val) => (draft = val));

      expect(draft).toBeNull();

      setDraft(mockEvent1);
      expect(draft).toEqual(mockEvent1);

      resetDraft();
      expect(draft).toBeNull();

      sub.unsubscribe();
    });
  });

  describe("Active Event", () => {
    it("should set and reset active event", () => {
      let activeId: string | null = null;
      const subId = activeEventId$.subscribe((val) => (activeId = val));

      let activeEvent: WithCompassId<Schema_Event> | undefined = undefined;
      const subEvent = activeEvent$.subscribe((val) => (activeEvent = val));

      // Add event to store first so it can be selected as active
      eventsStore.update(addEntities([mockEvent1]));

      expect(activeId).toBeNull();
      expect(activeEvent).toBeUndefined();

      setActiveEvent(mockEvent1._id);
      expect(activeId).toBe(mockEvent1._id);
      expect(activeEvent).toEqual(mockEvent1);

      resetActiveEvent();
      expect(activeId).toBeUndefined();
      expect(activeEvent).toBeUndefined();

      subId.unsubscribe();
      subEvent.unsubscribe();
    });
  });

  describe("Events", () => {
    it("should update event and reflect in observables", () => {
      let allDayEvents: WithCompassId<Schema_Event>[] = [];
      const subAllDay = allDayEvents$.subscribe((val) => (allDayEvents = val));

      let timedEvents: WithCompassId<Schema_Event>[] = [];
      const subTimed = timedEvents$.subscribe((val) => (timedEvents = val));

      eventsStore.update(addEntities([mockEvent1, mockEvent2]));

      expect(allDayEvents).toEqual([mockEvent2]);
      expect(timedEvents).toEqual([mockEvent1]);

      // Update event 1 to be all day
      updateEvent({ ...mockEvent1, isAllDay: true });

      expect(allDayEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _id: "1" }),
          expect.objectContaining({ _id: "2" }),
        ]),
      );
      expect(timedEvents).toEqual([]);

      subAllDay.unsubscribe();
      subTimed.unsubscribe();
    });
  });
});
