import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  readGoogleConnectStatus,
  showGoogleConnectStatusToast,
} from "./google-connect-status.util";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("google-connect-status.util", () => {
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

  /** Flush both rAF frames used by `showGoogleConnectStatusToast`. */
  const runToastAfterPaint = () => {
    const first = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of first) callback(0);
    const second = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of second) callback(0);
  };

  describe("readGoogleConnectStatus", () => {
    it("reads connected/declined/error off a provider=google redirect", () => {
      expect(readGoogleConnectStatus("?provider=google&status=connected")).toBe(
        "connected",
      );
      expect(readGoogleConnectStatus("?provider=google&status=declined")).toBe(
        "declined",
      );
      expect(readGoogleConnectStatus("?provider=google&status=error")).toBe(
        "error",
      );
    });

    it("reads missingScopes off a partial-grant redirect", () => {
      expect(
        readGoogleConnectStatus("?provider=google&status=missingScopes"),
      ).toBe("missingScopes");
    });

    it("returns null when provider is missing or not google", () => {
      expect(readGoogleConnectStatus("?status=connected")).toBeNull();
      expect(
        readGoogleConnectStatus("?provider=outlook&status=connected"),
      ).toBeNull();
    });

    it("returns null for an unrecognized status value", () => {
      expect(
        readGoogleConnectStatus("?provider=google&status=pending"),
      ).toBeNull();
    });

    it("returns null with no query string at all", () => {
      expect(readGoogleConnectStatus("")).toBeNull();
    });
  });

  describe("showGoogleConnectStatusToast", () => {
    it("does nothing until the deferred paint frame runs", () => {
      showGoogleConnectStatusToast("connected");
      expect(mocks.toast).not.toHaveBeenCalled();
    });

    it("shows a success toast for connected", () => {
      showGoogleConnectStatusToast("connected");
      runToastAfterPaint();

      expect(mocks.success).toHaveBeenCalledWith(
        "Google Calendar connected.",
        expect.objectContaining({ toastId: "google-connect-success" }),
      );
    });

    it("shows a neutral, non-blaming toast for declined", () => {
      showGoogleConnectStatusToast("declined");
      runToastAfterPaint();

      expect(mocks.info).toHaveBeenCalledWith(
        "No problem - nothing was connected. You can add the account anytime from Settings.",
        expect.objectContaining({ toastId: "google-connect-declined" }),
      );
    });

    it("shows a scope-specific toast for missingScopes, not the generic connect-failed one", () => {
      showGoogleConnectStatusToast("missingScopes");
      runToastAfterPaint();

      expect(mocks.error).toHaveBeenCalledWith(
        "Compass needs calendar permission to sync. Reconnect from Settings and leave the calendar box checked.",
        expect.objectContaining({
          toastId: "google-connect-missing-scopes",
          autoClose: false,
        }),
      );
    });

    it("shows a retryable error toast for error", () => {
      showGoogleConnectStatusToast("error");
      runToastAfterPaint();

      expect(mocks.error).toHaveBeenCalledWith(
        "We couldn't connect your Google account. Please try again from Settings.",
        expect.objectContaining({
          toastId: "google-connect-failed",
          autoClose: false,
        }),
      );
    });
  });
});
