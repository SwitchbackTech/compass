import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  type GoogleConnectionState,
  type UserMetadata,
} from "@core/types/user.types";
import { IS_DEV } from "@web/common/constants/env.constants";

export type UserMetadataStatus = "idle" | "loading" | "loaded";

export interface UserMetadataState {
  current: UserMetadata | null;
  status: UserMetadataStatus;
}

export const initialUserMetadataState: UserMetadataState = {
  current: null,
  status: "idle",
};

// Selectors passed to this hook must return primitives or stable references;
// a selector that builds a new object/array each call needs `useShallow`.
export const useUserMetadataStore = create<UserMetadataState>()(
  devtools(() => initialUserMetadataState, {
    name: "compass/userMetadata",
    enabled: IS_DEV,
  }),
);

export const userMetadataActions = {
  setLoading: () =>
    useUserMetadataStore.setState({ status: "loading" }, false, {
      type: "setLoading",
    }),
  finishLoading: () =>
    useUserMetadataStore.setState(
      (state) => ({ status: state.current ? "loaded" : "idle" }),
      false,
      { type: "finishLoading" },
    ),
  set: (metadata: UserMetadata) =>
    useUserMetadataStore.setState(
      { current: metadata, status: "loaded" },
      false,
      { type: "set" },
    ),
  clear: () =>
    useUserMetadataStore.setState(initialUserMetadataState, true, {
      type: "clear",
    }),
};

// Expose a semantic bridge for e2e tests (see e2e/utils/compass-window.ts).
// Tests drive connection-status scenarios by setting metadata directly.
if (typeof window !== "undefined") {
  window.__COMPASS_E2E_STORE__ = {
    userMetadata: {
      getState: useUserMetadataStore.getState,
      set: userMetadataActions.set,
      setLoading: userMetadataActions.setLoading,
      clear: userMetadataActions.clear,
    },
  };
}

export const selectUserMetadata = (state: UserMetadataState) => state.current;

export const selectUserMetadataStatus = (state: UserMetadataState) =>
  state.status;

export const selectGoogleMetadata = (state: UserMetadataState) =>
  state.current?.google;

/**
 * Selects the unified Google connection state computed by the server.
 * Returns "NOT_CONNECTED" if metadata hasn't loaded yet.
 */
export const selectGoogleConnectionState = (
  state: UserMetadataState,
): GoogleConnectionState =>
  state.current?.google?.connectionState ?? "NOT_CONNECTED";
