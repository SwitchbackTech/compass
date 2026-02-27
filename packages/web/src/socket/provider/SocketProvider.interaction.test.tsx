import { act } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/websocket.constants";
import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "./SocketProvider";
import SocketProvider from "./SocketProvider";

// Mock dependencies
jest.mock("@web/auth/hooks/user/useUser", () => ({
  useUser: () => ({ userId: "test-user-id" }),
}));

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeListener: jest.fn(),
    connected: false,
  })),
}));

/**
 * Integration tests for the Google Calendar re-authentication flow.
 *
 * These tests validate the complete user experience when re-authenticating
 * after a session expires, ensuring the spinner appears during import
 * and disappears correctly when the import completes or times out.
 */
describe("GCal Re-Authentication Flow", () => {
  // Socket event callbacks captured during render
  let importEndCallback: ((data?: string) => void) | undefined;
  let importStartCallback: (() => void) | undefined;

  // Default timeout for import operations (30 seconds is reasonable for GCal sync)
  const IMPORT_TIMEOUT_MS = 30_000;

  const createTestStore = (preloadedState?: {
    isImportPending?: boolean;
    importing?: boolean;
    isAuthenticating?: boolean;
  }) => {
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
            importing: preloadedState?.importing ?? false,
            importResults: null,
            pendingLocalEventsSynced: null,
            isImportPending: preloadedState?.isImportPending ?? false,
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
    importEndCallback = undefined;
    importStartCallback = undefined;

    // Capture socket event handlers when they're registered
    (socket.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === IMPORT_GCAL_END) {
        importEndCallback = callback;
      }
      if (event === IMPORT_GCAL_START) {
        importStartCallback = callback;
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.removeAttribute("data-app-locked");
  });

  describe("Spinner visibility during import", () => {
    it("shows spinner when user initiates re-authentication", async () => {
      // User clicks "Reconnect Google Calendar" which sets isImportPending = true
      const store = createTestStore({ isImportPending: true });

      render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      // Spinner should be visible with import message
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please hang tight while we sync your calendar"),
      ).toBeInTheDocument();

      // App should be locked (no interactions allowed)
      expect(document.body.getAttribute("data-app-locked")).toBe("true");
    });

    it("keeps spinner visible when IMPORT_GCAL_START event arrives", async () => {
      const store = createTestStore({ isImportPending: true });

      render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importStartCallback).toBeDefined();
      });

      // Backend sends IMPORT_GCAL_START
      await act(async () => {
        importStartCallback?.();
      });

      // Spinner should still be visible
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // State should now have importing = true
      const state = store.getState();
      expect(state.sync.importGCal.importing).toBe(true);
    });

    it("hides spinner when import completes successfully", async () => {
      const store = createTestStore({ isImportPending: true });

      const { container } = render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importEndCallback).toBeDefined();
      });

      // Verify spinner is initially visible
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // Backend sends IMPORT_GCAL_START then IMPORT_GCAL_END with success
      await act(async () => {
        importStartCallback?.();
      });

      await act(async () => {
        importEndCallback?.(
          JSON.stringify({ eventsCount: 15, calendarsCount: 3 }),
        );
      });

      // Allow buffered visibility to settle
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Spinner should be hidden
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();

      // App should be unlocked
      expect(container.firstChild).toBeNull();
      expect(document.body.getAttribute("data-app-locked")).toBeNull();

      // State should reflect successful import
      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 15,
        calendarsCount: 3,
      });
      expect(state.sync.importGCal.importing).toBe(false);
      expect(state.sync.importGCal.isImportPending).toBe(false);
    });

    it("hides spinner when import completes with zero events", async () => {
      const store = createTestStore({ isImportPending: true });

      render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importEndCallback).toBeDefined();
      });

      // Backend sends IMPORT_GCAL_END with zero events (valid response)
      await act(async () => {
        importEndCallback?.(
          JSON.stringify({ eventsCount: 0, calendarsCount: 1 }),
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Spinner should be hidden even with zero events
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();

      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 0,
        calendarsCount: 1,
      });
    });
  });

  describe("Complete re-authentication flow", () => {
    it("handles full flow: OAuth → import start → import end", async () => {
      // Start with OAuth in progress (user clicked Connect/Reconnect)
      const store = createTestStore({
        isAuthenticating: true,
        isImportPending: true,
      });

      const { rerender } = render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      // Phase 1: OAuth in progress - should show sign-in message
      expect(
        screen.getByText("Complete Google sign-in..."),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(importStartCallback).toBeDefined();
      });

      // OAuth completes, transition to import phase
      await act(async () => {
        store.dispatch(authSlice.actions.resetAuth());
      });

      rerender(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      // Phase 2: Import in progress - should show import message
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // Backend starts import
      await act(async () => {
        importStartCallback?.();
      });

      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // Backend completes import
      await act(async () => {
        importEndCallback?.(
          JSON.stringify({ eventsCount: 42, calendarsCount: 2 }),
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Phase 3: Complete - spinner should be gone
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Complete Google sign-in..."),
      ).not.toBeInTheDocument();

      // Verify final state
      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 42,
        calendarsCount: 2,
      });
      expect(state.sync.importLatest.isFetchNeeded).toBe(true);
    });
  });

  describe("Timeout handling", () => {
    it("import should complete within sensible timeout", async () => {
      const store = createTestStore({ isImportPending: true });

      render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importEndCallback).toBeDefined();
      });

      // Simulate time passing but import completes before timeout
      await act(async () => {
        jest.advanceTimersByTime(IMPORT_TIMEOUT_MS / 2); // 15 seconds
      });

      // Spinner should still be visible (waiting for backend)
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // Backend responds successfully
      await act(async () => {
        importEndCallback?.(
          JSON.stringify({ eventsCount: 10, calendarsCount: 1 }),
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Should complete successfully
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();

      const state = store.getState();
      expect(state.sync.importGCal.importResults).not.toBeNull();
    });

    it("handles error response from backend", async () => {
      const store = createTestStore({ isImportPending: true });

      render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importEndCallback).toBeDefined();
      });

      // Backend sends malformed JSON (error case)
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        importEndCallback?.("invalid-json-{{{");
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Spinner should be hidden (error state also hides spinner)
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();

      // State should reflect error
      const state = store.getState();
      expect(state.sync.importGCal.importError).toBe(
        "Failed to parse Google Calendar import results.",
      );
      expect(state.sync.importGCal.isImportPending).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("Race condition handling (ref pattern)", () => {
    it("processes import end correctly when state changes between renders", async () => {
      // Start with isImportPending = false
      const store = createTestStore({ isImportPending: false });

      const { rerender } = render(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      await waitFor(() => {
        expect(importEndCallback).toBeDefined();
      });

      // User clicks Reconnect - state changes to isImportPending = true
      await act(async () => {
        store.dispatch(importGCalSlice.actions.setIsImportPending(true));
      });

      rerender(
        <Provider store={store}>
          <SocketProvider>
            <SyncEventsOverlay />
          </SocketProvider>
        </Provider>,
      );

      // Spinner should now be visible
      expect(
        screen.getByText("Importing your Google Calendar events..."),
      ).toBeInTheDocument();

      // Event arrives - with the ref pattern fix, this should process correctly
      await act(async () => {
        importEndCallback?.(
          JSON.stringify({ eventsCount: 25, calendarsCount: 4 }),
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Spinner should be hidden (fix prevents stale closure issue)
      expect(
        screen.queryByText("Importing your Google Calendar events..."),
      ).not.toBeInTheDocument();

      // Results should be set correctly
      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 25,
        calendarsCount: 4,
      });
    });
  });
});
