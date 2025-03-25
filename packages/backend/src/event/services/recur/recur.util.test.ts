import { createNewRecurringEventPayload } from "@backend/__tests__/fixtures/recurring/create/create";
import { deleteAllPayloads } from "@backend/__tests__/fixtures/recurring/delete/all";
import { deleteSingleEventPayloads } from "@backend/__tests__/fixtures/recurring/delete/single";
import { deleteThisAndFollowingPayloads } from "@backend/__tests__/fixtures/recurring/delete/this-and-following";
import { editAllPayloads } from "@backend/__tests__/fixtures/recurring/edit/all";
import { editSingleEventPayloads } from "@backend/__tests__/fixtures/recurring/edit/single";
import { editThisAndFollowingPayloads } from "@backend/__tests__/fixtures/recurring/edit/this-and-following";
import { analyzeEventPayload } from "@backend/event/services/recur/recur.util";

describe("Gcal Recurring Event Payload Analysis", () => {
  it("should conclude CREATE_SERIES after new recurring event creation", () => {
    const analysis = analyzeEventPayload(
      createNewRecurringEventPayload.items || [],
    );
    expect(analysis.action).toBe("CREATE_SERIES");
    expect(analysis.baseEvent).toBeDefined();
    expect(analysis.baseEvent?.recurrence).toBeDefined();
  });

  it("should conclude UPDATE_INSTANCE after single instance update", () => {
    for (const instance of editSingleEventPayloads) {
      const analysis = analyzeEventPayload(instance.items || []);
      expect(analysis.action).toBe("UPDATE_INSTANCE");
      expect(analysis.modifiedInstance).toBeDefined();
      expect(analysis.modifiedInstance?.recurringEventId).toBeDefined();
    }
  });

  it("should conclude MODIFY_SERIES after series split", () => {
    for (const payload of editThisAndFollowingPayloads) {
      const analysis = analyzeEventPayload(payload.items || []);
      expect(analysis.action).toBe("MODIFY_SERIES");
      expect(analysis.baseEvent).toBeDefined();
      expect(analysis.newBaseEvent).toBeDefined();
      expect(analysis.endDate).toBeDefined();
      expect(
        analysis.baseEvent?.recurrence?.some((rule) => rule.includes("UNTIL")),
      ).toBe(true);
    }
  });

  it("should conclude MODIFY_SERIES after series update", () => {
    for (const payload of editAllPayloads) {
      const analysis = analyzeEventPayload(payload.items || []);
      expect(analysis.action).toBe("MODIFY_SERIES");
      expect(analysis.baseEvent).toBeDefined();
      expect(analysis.baseEvent?.recurrence).toBeDefined();
    }
  });

  describe("Delete", () => {
    it("should conclude DELETE_SERIES after deleting all instances", () => {
      for (const payload of deleteAllPayloads) {
        const analysis = analyzeEventPayload(payload.items || []);
        expect(analysis.action).toBe("DELETE_SERIES");
        expect(analysis.baseEvent).toBeUndefined();
        expect(analysis.modifiedInstance).toBeUndefined();
        expect(analysis.newBaseEvent).toBeUndefined();
      }
    });

    it("should conclude DELETE_INSTANCES after deleting single instance", () => {
      for (const payload of deleteSingleEventPayloads) {
        const analysis = analyzeEventPayload(payload.items || []);
        expect(analysis.action).toBe("DELETE_INSTANCES");
        expect(analysis.baseEvent).toBeDefined();
        expect(analysis.modifiedInstance).toBeDefined();
        expect(analysis.modifiedInstance?.status).toBe("cancelled");
        expect(analysis.modifiedInstance?.recurringEventId).toBeDefined();
      }
    });

    it("should conclude DELETE_INSTANCES after deleting this and following instances", () => {
      for (const payload of deleteThisAndFollowingPayloads) {
        const analysis = analyzeEventPayload(payload.items || []);
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
