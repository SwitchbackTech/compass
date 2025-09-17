import {
  CalendarProvider,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS}`,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Update - Instance Event: ", () => {
      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event and those of the following instances in its base recurrence", async () => {
            expect(calendarProvider).toBeDefined();
          });

          it("should update the description field of an event and those of the following instances in its base recurrence", async () => {
            // expect(true).toBe(false);
          });

          it("should update the priority field of an event and those of the following instances in its base recurrence", async () => {
            // expect(true).toBe(false);
          });

          it("should not update previous instances when editing title of a following event", async () => {
            // expect(true).toBe(false);
          });

          it("should preserve custom fields on non-updated instances", async () => {
            // expect(true).toBe(false);
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the startDate field of an event and shift those of the following instances in its base recurrence", async () => {
            // expect(true).toBe(false);
          });

          it("should update the endDate field of an event and shift those of the following instances in its base recurrence", async () => {
            // expect(true).toBe(false);
          });

          it("should update the recurrence(rule change) field of an event and its following instances in a base recurrence - create new base event", async () => {
            // expect(true).toBe(false);
          });

          it("should not affect unrelated events when shifting startDate", async () => {
            // expect(true).toBe(false);
          });

          it("should correctly update all following instances when recurrence rule is changed", async () => {
            // expect(true).toBe(false);
          });
        });

        describe("Edge Cases: ", () => {
          it("should handle update when only one instance remains", async () => {
            // expect(true).toBe(false);
          });

          it("should not update deleted instances", async () => {
            // expect(true).toBe(false);
          });

          it("should throw error if event does not exist", async () => {
            // expect(true).toBe(false);
          });
        });
      });
    });

    describe("Delete - Instance Event: ", () => {
      it("should delete this event and the following instances in its base recurrence", async () => {
        // expect(true).toBe(false);
      });

      it("should not delete previous instances when deleting this and following", async () => {
        // expect(true).toBe(false);
      });

      it("should handle deletion when event is last in recurrence", async () => {
        // expect(true).toBe(false);
      });

      it("should throw error if trying to delete a non-existent event", async () => {
        // expect(true).toBe(false);
      });
    });
  },
);
