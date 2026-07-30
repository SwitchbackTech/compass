import { act, cleanup, renderHook } from "@testing-library/react";
import {
  resetGoogleSyncUIStateForTests,
  setSyncingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { resolveGoogleUiState, useGoogleUiState } from "./useGoogleUiState";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

beforeEach(() => {
  resetGoogleSyncUIStateForTests();
  userMetadataActions.clear();
});

afterEach(() => {
  cleanup();
  resetGoogleSyncUIStateForTests();
  userMetadataActions.clear();
});

describe("useGoogleUiState", () => {
  it("reflects the loaded Google connection state", () => {
    userMetadataActions.set({ google: { connectionState: "HEALTHY" } });

    const { result } = renderHook(() => useGoogleUiState());

    expect(result.current).toBe("HEALTHY");
  });

  it("prioritizes the transient syncing state", () => {
    userMetadataActions.set({ google: { connectionState: "HEALTHY" } });
    const { result } = renderHook(() => useGoogleUiState());

    act(() => setSyncingSyncIndicatorOverride());
    expect(result.current).toBe("IMPORTING");
  });

  it("reports checking while a returning user's metadata loads", () => {
    expect(
      resolveGoogleUiState({
        connectionState: "NOT_CONNECTED",
        hasAuthenticated: true,
        syncIndicator: null,
        userMetadataStatus: "loading",
      }),
    ).toBe("checking");
  });
});
