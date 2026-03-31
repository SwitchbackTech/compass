const googleSyncUIListeners = new Set<() => void>();

let hasTriggeredAutoImportForRestart = false;
let isRepairRequested = false;

const emitGoogleSyncUIChange = () => {
  googleSyncUIListeners.forEach((listener) => listener());
};

export const clearRepairRequested = () => {
  if (!isRepairRequested) {
    return;
  }

  isRepairRequested = false;
  emitGoogleSyncUIChange();
};

export const getIsRepairRequested = () => isRepairRequested;

export const hasAutoImportBeenTriggeredForRestart = () =>
  hasTriggeredAutoImportForRestart;

export const markAutoImportTriggeredForRestart = () => {
  hasTriggeredAutoImportForRestart = true;
};

export const markRepairRequested = () => {
  if (isRepairRequested) {
    return;
  }

  isRepairRequested = true;
  emitGoogleSyncUIChange();
};

export const resetAutoImportTriggeredForRestart = () => {
  hasTriggeredAutoImportForRestart = false;
};

export const resetGoogleSyncUIStateForTests = () => {
  hasTriggeredAutoImportForRestart = false;
  isRepairRequested = false;
  emitGoogleSyncUIChange();
};

export const subscribeToGoogleSyncUIState = (listener: () => void) => {
  googleSyncUIListeners.add(listener);

  return () => {
    googleSyncUIListeners.delete(listener);
  };
};
