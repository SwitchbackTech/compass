import { useEffect } from "react";

const lockReasons = new Set<string>();

function syncAppLockedDataset() {
  if (lockReasons.size > 0) {
    document.body.dataset.appLocked = "true";
    return;
  }

  delete document.body.dataset.appLocked;
}

/**
 * Named lock reasons so overlapping overlays (palette + welcome, etc.) can
 * open/close independently without clearing each other's lock.
 */
export function setAppLockReason(reason: string, locked: boolean) {
  if (locked) {
    lockReasons.add(reason);
  } else {
    lockReasons.delete(reason);
  }
  syncAppLockedDataset();
}

/** Clears every reason — used by tests between cases. */
export function clearAppLockReasons() {
  lockReasons.clear();
  syncAppLockedDataset();
}

export function isAppLocked(): boolean {
  return document.body.dataset.appLocked === "true";
}

export function useAppLockReason(reason: string, locked: boolean) {
  useEffect(() => {
    setAppLockReason(reason, locked);
    return () => setAppLockReason(reason, false);
  }, [locked, reason]);
}
