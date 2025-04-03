import { createNewRecurringEventPayload } from "@backend/__tests__/mocks.gcal/fixtures/recurring/create/create";
import { deleteAllPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/delete/all";
import { deleteSingleEventPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/delete/single";
import { deleteThisAndFollowingPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/delete/this-and-following";
import { editAllPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/edit/all";
import { editSingleEventPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/edit/single";
import { editThisAndFollowingPayloads } from "@backend/__tests__/mocks.gcal/fixtures/recurring/edit/this-and-following";
import { determineNextAction } from "@backend/event/services/recurrence/parse/recur.gcal.parse";

describe("Gcal Recurring Event Payload Analysis", () => {
  describe("Create", () => {
    it("should return CREATE_SERIES after new recurring event creation", () => {
      const analysis = determineNextAction(
        createNewRecurringEventPayload.items || [],
      );
      expect(analysis.action).toBe("CREATE_SERIES");
      expect(analysis.baseEvent).toBeDefined();
      expect(analysis.baseEvent?.recurrence).toBeDefined();
    });
  });

  describe("Update", () => {
    it("should return UPDATE_INSTANCE after single instance update", () => {
      for (const instance of editSingleEventPayloads) {
        const analysis = determineNextAction(instance.items || []);
        expect(analysis.action).toBe("UPDATE_INSTANCE");
        expect(analysis.modifiedInstance).toBeDefined();
        expect(analysis.modifiedInstance?.recurringEventId).toBeDefined();
      }
    });

    it("should return UPDATE_SERIES after series split", () => {
      for (const payload of editThisAndFollowingPayloads) {
        const analysis = determineNextAction(payload.items || []);
        expect(analysis.action).toBe("UPDATE_SERIES");
        expect(analysis.baseEvent).toBeDefined();
        expect(analysis.newBaseEvent).toBeDefined();
        expect(analysis.deleteFrom).toBeDefined();
        expect(
          analysis.baseEvent?.recurrence?.some((rule) =>
            rule.includes("UNTIL"),
          ),
        ).toBe(true);
      }
    });

    it("should return UPDATE_SERIES after series update", () => {
      for (const payload of editAllPayloads) {
        const analysis = determineNextAction(payload.items || []);
        expect(analysis.action).toBe("UPDATE_SERIES");
        expect(analysis.baseEvent).toBeDefined();
        expect(analysis.baseEvent?.recurrence).toBeDefined();
      }
    });
  });
  describe("Delete", () => {
    it("should return DELETE_SERIES after deleting all instances", () => {
      for (const payload of deleteAllPayloads) {
        const analysis = determineNextAction(payload.items || []);
        expect(analysis.action).toBe("DELETE_SERIES");
        expect(analysis.baseEvent).toBeUndefined();
        expect(analysis.modifiedInstance).toBeUndefined();
        expect(analysis.newBaseEvent).toBeUndefined();
      }
    });

    it("should return DELETE_INSTANCES after deleting single instance", () => {
      for (const payload of deleteSingleEventPayloads) {
        const analysis = determineNextAction(payload.items || []);
        expect(analysis.action).toBe("DELETE_INSTANCES");
        expect(analysis.baseEvent).toBeDefined();
        expect(analysis.modifiedInstance).toBeDefined();
        expect(analysis.modifiedInstance?.status).toBe("cancelled");
        expect(analysis.modifiedInstance?.recurringEventId).toBeDefined();
      }
    });

    it("should return DELETE_INSTANCES after deleting this and following instances", () => {
      for (const payload of deleteThisAndFollowingPayloads) {
        const analysis = determineNextAction(payload.items || []);
        expect(analysis.action).toBe("DELETE_INSTANCES");
        expect(analysis.baseEvent).toBeDefined();
        expect(
          analysis.baseEvent?.recurrence?.some((rule) =>
            rule.includes("UNTIL"),
          ),
        ).toBe(true);
        expect(analysis.modifiedInstance).toBeDefined();
        expect(analysis.modifiedInstance?.status).toBe("cancelled");
      }
    });
  });
});
