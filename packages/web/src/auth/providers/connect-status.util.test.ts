import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import * as userMetadataUtil from "@web/auth/compass/user/util/user-metadata.util";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  readConnectStatus,
  refreshUserMetadataAfterConnect,
  showConnectStatusToast,
} from "./connect-status.util";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("connect-status.util", () => {
  const { port, mocks } = createTestToastPort();

  let rafCallbacks: FrameRequestCallback[];
  let rafSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mocks.toast.mockClear();
    mocks.info.mockClear();
    mocks.success.mockClear();
    mocks.error.mockClear();
    registerToastPort(port);
    rafCallbacks = [];
    rafSpy = spyOn(globalThis, "requestAnimationFrame").mockImplementation(((
      callback: FrameRequestCallback,
    ) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame);
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  const runToastAfterPaint = () => {
    const first = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of first) callback(0);
    const second = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of second) callback(0);
  };

  describe("readConnectStatus", () => {
    it("reads google and microsoft redirects", () => {
      expect(readConnectStatus("?provider=google&status=connected")).toEqual({
        provider: "google",
        status: "connected",
      });
      expect(readConnectStatus("?provider=microsoft&status=connected")).toEqual(
        {
          provider: "microsoft",
          status: "connected",
        },
      );
    });

    it("returns null when provider or status is missing", () => {
      expect(readConnectStatus("?status=connected")).toBeNull();
      expect(
        readConnectStatus("?provider=outlook&status=connected"),
      ).toBeNull();
      expect(readConnectStatus("?provider=google&status=pending")).toBeNull();
      expect(readConnectStatus("")).toBeNull();
    });
  });

  describe("showConnectStatusToast", () => {
    it("keeps the Google connected toast unchanged", () => {
      showConnectStatusToast({ provider: "google", status: "connected" });
      runToastAfterPaint();
      expect(mocks.success).toHaveBeenCalledWith(
        "Google Calendar connected.",
        expect.objectContaining({ toastId: "google-connect-success" }),
      );
    });

    it("shows a Microsoft connected toast", () => {
      showConnectStatusToast({ provider: "microsoft", status: "connected" });
      runToastAfterPaint();
      expect(mocks.success).toHaveBeenCalledWith(
        "Microsoft connected.",
        expect.objectContaining({ toastId: "connect-success" }),
      );
    });
  });

  describe("refreshUserMetadataAfterConnect", () => {
    it("force-refreshes metadata after a completed connect", () => {
      const refreshSpy = spyOn(
        userMetadataUtil,
        "refreshUserMetadata",
      ).mockResolvedValue(undefined);

      refreshUserMetadataAfterConnect("connected");
      expect(refreshSpy).toHaveBeenCalledWith({ force: true });

      refreshSpy.mockRestore();
    });
  });
});
