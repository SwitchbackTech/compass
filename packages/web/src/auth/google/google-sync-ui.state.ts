const googleSyncUIListeners = new Set<() => void>();

export type GoogleSyncIndicatorOverride = null | "repairing" | "syncing";

let googleSyncIndicatorOverride: GoogleSyncIndicatorOverride = null;

const emitGoogleSyncUIChange = () => {
  googleSyncUIListeners.forEach((listener) => listener());
};

const setGoogleSyncIndicatorOverride = (
  nextOverride: GoogleSyncIndicatorOverride,
) => {
  if (googleSyncIndicatorOverride === nextOverride) {
    return;
  }

  googleSyncIndicatorOverride = nextOverride;
  emitGoogleSyncUIChange();
};

export const clearGoogleSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride(null);
};

export const getGoogleSyncIndicatorOverride = () => googleSyncIndicatorOverride;

export const setRepairingSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride("repairing");
};

export const setSyncingSyncIndicatorOverride = () => {
  setGoogleSyncIndicatorOverride("syncing");
};

export const resetGoogleSyncUIStateForTests = () => {
  googleSyncIndicatorOverride = null;
  emitGoogleSyncUIChange();
};

export const subscribeToGoogleSyncUIState = (listener: () => void) => {
  googleSyncUIListeners.add(listener);

  return () => {
    googleSyncUIListeners.delete(listener);
  };
};
