import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { queryClient } from "@web/api/query-client";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

const mockRefreshEventRepositorySource = mock();
const mockUserMetadataActionsClear = mock();
const mockClearGoogleSyncIndicatorOverride = mock();
const mockSseCloseStream = mock();
const mockDraftActionsDiscard = mock();

mock.module("@web/events/repositories/event.repository.source.store", () => ({
  refreshEventRepositorySource: mockRefreshEventRepositorySource,
}));

mock.module("@web/auth/state/user-metadata.store", () => ({
  userMetadataActions: {
    clear: mockUserMetadataActionsClear,
  },
}));

mock.module("@web/auth/google/state/google.sync.state", () => ({
  clearGoogleSyncIndicatorOverride: mockClearGoogleSyncIndicatorOverride,
}));

mock.module("@web/sse/client/sse.client", () => ({
  closeStream: mockSseCloseStream,
}));

mock.module("@web/events/stores/draft.store", () => ({
  draftActions: {
    discard: mockDraftActionsDiscard,
  },
}));

const {
  clearAccountScopedClientState,
  clearAccountScopedQueryCache,
} = await import("./logout.teardown");

describe("logout.teardown", () => {
  beforeEach(() => {
    mockRefreshEventRepositorySource.mockClear();
    mockUserMetadataActionsClear.mockClear();
    mockClearGoogleSyncIndicatorOverride.mockClear();
    mockSseCloseStream.mockClear();
    mockDraftActionsDiscard.mockClear();
  });

  describe("clearAccountScopedClientState", () => {
    it("calls all teardown functions in order", () => {
      const callOrder: string[] = [];
      mockRefreshEventRepositorySource.mockImplementation(() => {
        callOrder.push("refreshEventRepositorySource");
      });
      mockUserMetadataActionsClear.mockImplementation(() => {
        callOrder.push("userMetadataActions.clear");
      });
      mockClearGoogleSyncIndicatorOverride.mockImplementation(() => {
        callOrder.push("clearGoogleSyncIndicatorOverride");
      });
      mockSseCloseStream.mockImplementation(() => {
        callOrder.push("closeStream");
      });
      mockDraftActionsDiscard.mockImplementation(() => {
        callOrder.push("draftActions.discard");
      });

      clearAccountScopedClientState();

      expect(callOrder).toEqual([
        "refreshEventRepositorySource",
        "userMetadataActions.clear",
        "clearGoogleSyncIndicatorOverride",
        "closeStream",
        "draftActions.discard",
      ]);
    });

    it("calls refreshEventRepositorySource with false", () => {
      clearAccountScopedClientState();
      expect(mockRefreshEventRepositorySource).toHaveBeenCalledWith(false);
    });
  });

  describe("clearAccountScopedQueryCache", () => {
    it("removes event, calendar, and availability queries", () => {
      const removeQueriesSpy = spyOn(queryClient, "removeQueries");

      clearAccountScopedQueryCache();

      expect(removeQueriesSpy).toHaveBeenCalledTimes(3);
      expect(removeQueriesSpy).toHaveBeenNthCalledWith(1, {
        queryKey: eventQueryKeys.all,
      });
      expect(removeQueriesSpy).toHaveBeenNthCalledWith(2, {
        queryKey: calendarQueryKeys.all,
      });
      expect(removeQueriesSpy).toHaveBeenNthCalledWith(3, {
        queryKey: ["availability"],
      });

      removeQueriesSpy.mockRestore();
    });
  });
});
