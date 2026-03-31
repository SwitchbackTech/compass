// Transient Google sync UI overrides (e.g. repairing, post-connect syncing) live outside
// Redux so auth/sync helpers can update them from async callbacks without dispatch.
// This module is a minimal external store (mutable snapshot + listener set). Consumers
// subscribe with useSyncExternalStore(subscribeToGoogleSyncUIState, getGoogleSyncIndicatorOverride, …).

const googleSyncUIListeners = new Set<() => void>();

type SyncIndicator = null | "repairing" | "syncing";

let gSyncIndicator: SyncIndicator = null;

const emitGoogleSyncUIChange = () => {
  googleSyncUIListeners.forEach((listener) => listener());
};

const setGoogleSyncIndicatorOverride = (nextOverride: SyncIndicator) => {
  if (gSyncIndicator === nextOverride) {
    return;
  }

  gSyncIndicator = nextOverride;
  emitGoogleSyncUIChange();
};

export const clearGoogleSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride(null);
};

export const getGoogleSyncIndicatorOverride = () => gSyncIndicator;

export const setRepairingSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride("repairing");
};

export const setSyncingSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride("syncing");
};

export const resetGoogleSyncUIStateForTests = () => {
  gSyncIndicator = null;
  emitGoogleSyncUIChange();
};

export const subscribeToGoogleSyncUIState = (listener: () => void) => {
  googleSyncUIListeners.add(listener);

  return () => {
    googleSyncUIListeners.delete(listener);
  };
};
