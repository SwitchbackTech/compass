import { type EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { Provider } from "react-redux";
import {
  type EnhancedStore,
  combineReducers,
  configureStore,
} from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import SSEProvider from "./SSEProvider";

type TestStore = EnhancedStore<{
  sync: {
    importGCal: ReturnType<typeof importGCalSlice.reducer>;
    importLatest: ReturnType<typeof importLatestSlice.reducer>;
  };
  auth: ReturnType<typeof authSlice.reducer>;
}>;

// Mock dependencies
jest.mock("@web/auth/user/hooks/useUser", () => ({
  useUser: () => ({ userId: "test-user-id" }),
}));
jest.mock("@web/auth/user/util/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../client/sse.client", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { EventEmitter2 } = require("eventemitter2");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream: jest.fn(),
    closeStream: jest.fn(),
    getStream: jest.fn(() => null),
    sseEmitter: sseEmitter as unknown as EventEmitter2,
  };
});

function getSseEmitter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("../client/sse.client") as { sseEmitter: EventEmitter2 })
    .sseEmitter;
}

function fireImportStart() {
  getSseEmitter().emit(
    IMPORT_GCAL_START,
    new MessageEvent(IMPORT_GCAL_START, { data: JSON.stringify({}) }),
  );
}

function fireImportEnd(payload: ImportGCalEndPayload) {
  getSseEmitter().emit(
    IMPORT_GCAL_END,
    new MessageEvent(IMPORT_GCAL_END, { data: JSON.stringify(payload) }),
  );
}

function fireUserMetadata(metadata: UserMetadata) {
  getSseEmitter().emit(
    USER_METADATA,
    new MessageEvent(USER_METADATA, { data: JSON.stringify(metadata) }),
  );
}

/**
 * Integration tests for the Google Calendar authentication and import flow.
 *
 * These tests validate the complete user experience, ensuring:
 * - OAuth popup blocks the app with "Complete Google sign-in" overlay
 * - Import runs in background with sidebar spinner (non-blocking)
 * - Overlay disappears immediately after OAuth completes
 */
describe("GCal Authentication Flow", () => {
  const createTestStore = (preloadedState?: {
    isAuthenticating?: boolean;
    isProcessingGcal?: boolean;
  }): TestStore => {
    return configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
        auth: authSlice.reducer,
      },
      preloadedState: {
        sync: {
          importGCal: {
            isRepairing: false,
            isProcessing: preloadedState?.isProcessingGcal ?? false,
            importResults: null,
            pendingLocalEventsSynced: null,
            importError: null,
            isLoading: false,
            value: undefined,
            error: undefined,
          },
          importLatest: {
            isFetchNeeded: false,
            reason: null,
          },
        },
        auth: {
          status: preloadedState?.isAuthenticating ? "authenticating" : "idle",
          error: null,
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.removeAttribute("data-app-locked");
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.removeAttribute("data-app-locked");
  });

  describe("OAuth phase (blocking)", () => {
    it("shows blocking overlay during OAuth popup", () => {
      const store = createTestStore({ isAuthenticating: true });

      render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      expect(
        screen.getByText("Complete Google sign-in..."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please complete authorization in the popup window"),
      ).toBeInTheDocument();
      expect(document.body).toHaveAttribute("data-app-locked", "true");
    });

    it("dismisses overlay immediately when OAuth completes", () => {
      const store = createTestStore({ isAuthenticating: true });

      const { rerender, container } = render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      expect(
        screen.getByText("Complete Google sign-in..."),
      ).toBeInTheDocument();

      // OAuth completes (auth state resets)
      act(() => {
        store.dispatch(authSlice.actions.resetAuth());
      });

      rerender(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      // Wait for buffered visibility to settle
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Overlay should be dismissed
      expect(
        screen.queryByText("Complete Google sign-in..."),
      ).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
      expect(document.body).not.toHaveAttribute("data-app-locked");
    });
  });

  describe("Import phase (non-blocking)", () => {
    it("does not show blocking overlay when not authenticating", () => {
      const store = createTestStore();

      const { container } = render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // No blocking overlay should be shown
      expect(container).toBeEmptyDOMElement();
      expect(document.body).not.toHaveAttribute("data-app-locked");
    });
  });

  describe("Complete authentication flow", () => {
    it("handles OAuth → import transition without stale state", async () => {
      // Start with OAuth in progress
      const store = createTestStore({ isAuthenticating: true });

      const { rerender, container } = render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      // Phase 1: OAuth in progress
      expect(
        screen.getByText("Complete Google sign-in..."),
      ).toBeInTheDocument();

      // OAuth completes, auth state resets
      act(() => {
        store.dispatch(authSlice.actions.resetAuth());
      });

      rerender(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Phase 2: Overlay should be dismissed (import runs in background)
      expect(
        screen.queryByText("Complete Google sign-in..."),
      ).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();

      // Backend completes import
      act(() => {
        fireImportEnd({
          operation: "REPAIR",
          status: "COMPLETED",
          eventsCount: 42,
          calendarsCount: 2,
        });
      });

      // Verify final state
      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 42,
        calendarsCount: 2,
      });
      expect(state.sync.importLatest.isFetchNeeded).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("handles import errors gracefully", async () => {
      const store = createTestStore({});

      render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

      act(() => {
        fireImportEnd({
          operation: "INCREMENTAL",
          status: "ERRORED",
          message:
            "Incremental Google Calendar sync failed for user: test-user",
        });
      });

      await waitFor(() => {
        expect(store.getState().sync.importGCal.importError).toBe(
          "Incremental Google Calendar sync failed for user: test-user",
        );
      });
    });
  });

  /**
   * Spinner lifecycle tests — validate isProcessing (the header spinner) behaves
   * correctly across the full repair / import lifecycle.
   *
   * Before this fix, isProcessing was never reset after IMPORT_GCAL_END,
   * causing the spinner to either stay on forever or flicker due to the
   * metadata-refresh loop triggering request() continuously.
   */
  describe("Spinner lifecycle (isProcessing)", () => {
    const renderProvider = (store: TestStore) =>
      render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

    it("dispatches request action when IMPORT_GCAL_START arrives", () => {
      // Note: createAsyncSlice's request() reducer is a no-op in NODE_ENV=test
      // (to prevent saga-triggered API calls), so we verify the action is dispatched
      // rather than checking isProcessing state directly.
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, "dispatch");
      renderProvider(store);

      act(() => {
        fireImportStart();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "async/importGCal/request" }),
      );
    });

    it("resets isProcessing after IMPORT_GCAL_END COMPLETED", () => {
      // Preload isProcessing=true since request() is a no-op in test mode.
      const store = createTestStore({ isProcessingGcal: true });
      renderProvider(store);

      act(() => {
        fireImportEnd({
          operation: "REPAIR",
          status: "COMPLETED",
          eventsCount: 100,
          calendarsCount: 1,
        });
      });

      // Previously stuck at true — this was the "spinner never disappears" bug.
      expect(store.getState().sync.importGCal.isProcessing).toBe(false);
    });

    it("resets isProcessing after IMPORT_GCAL_END IGNORED", () => {
      // Preload isProcessing=true since request() is a no-op in test mode.
      const store = createTestStore({ isProcessingGcal: true });
      renderProvider(store);

      act(() => {
        fireImportEnd({
          operation: "REPAIR",
          status: "IGNORED",
          message: "Import is in progress or completed, ignoring this request",
        });
      });

      // Previously: IGNORED returned early with no dispatch — isProcessing stayed true.
      // This was the root cause of the import loop (IGNORED → refreshMetadata →
      // IMPORTING state → request() → saga → IGNORED again → ...).
      expect(store.getState().sync.importGCal.isProcessing).toBe(false);
    });

    it("resets isProcessing after IMPORT_GCAL_END ERRORED", () => {
      // Preload isProcessing=true since request() is a no-op in test mode.
      const store = createTestStore({ isProcessingGcal: true });
      renderProvider(store);

      act(() => {
        fireImportEnd({
          operation: "REPAIR",
          status: "ERRORED",
          message: "Google Calendar repair failed",
        });
      });

      expect(store.getState().sync.importGCal.isProcessing).toBe(false);
    });
  });

  /**
   * Metadata-driven state tests — validate how USER_METADATA SSE events
   * affect the spinner and the auto-import saga trigger.
   *
   * The key invariant: only IMPORTING shows the spinner; RESTART kicks off
   * the saga silently (no spinner until IMPORT_GCAL_START confirms it started).
   */
  describe("Metadata-driven import state", () => {
    const renderProvider = (store: TestStore) =>
      render(
        <Provider store={store}>
          <SSEProvider>
            <SyncEventsOverlay />
          </SSEProvider>
        </Provider>,
      );

    it("dispatches request action when USER_METADATA reports IMPORTING", () => {
      // Note: createAsyncSlice's request() is a no-op in test mode, so we verify
      // the action was dispatched rather than checking isProcessing state directly.
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, "dispatch");
      renderProvider(store);

      act(() => {
        fireUserMetadata({
          google: { connectionState: "IMPORTING" },
          sync: { importGCal: "IMPORTING" },
        });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "async/importGCal/request" }),
      );
    });

    it("does not set isProcessing when USER_METADATA reports RESTART", () => {
      // RESTART triggers the auto-import saga (triggerAutoImport action) but
      // must NOT show the spinner — the spinner only appears when the backend
      // confirms the import has actually started via IMPORT_GCAL_START.
      // Showing the spinner for RESTART caused the original flicker.
      const store = createTestStore();
      renderProvider(store);

      act(() => {
        fireUserMetadata({
          google: { connectionState: "ATTENTION" },
          sync: { importGCal: "RESTART" },
        });
      });

      expect(store.getState().sync.importGCal.isProcessing).toBeFalsy();
    });

    it("does not set isProcessing when USER_METADATA reports NOT_CONNECTED", () => {
      const store = createTestStore();
      renderProvider(store);

      act(() => {
        fireUserMetadata({
          google: { connectionState: "NOT_CONNECTED" },
          sync: { importGCal: "IMPORTING" },
        });
      });

      expect(store.getState().sync.importGCal.isProcessing).toBeFalsy();
    });

    it("does not set isProcessing when USER_METADATA reports COMPLETED", () => {
      const store = createTestStore();
      renderProvider(store);

      act(() => {
        fireUserMetadata({
          google: { connectionState: "HEALTHY" },
          sync: { importGCal: "COMPLETED" },
        });
      });

      expect(store.getState().sync.importGCal.isProcessing).toBeFalsy();
    });
  });
});
