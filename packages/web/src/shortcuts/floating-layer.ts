import { useEffect } from "react";

const openLayers = new Set<string>();

/**
 * Named floating-layer reasons so nested Escape owners (menus, listboxes,
 * date pickers) can open/close independently without DOM visibility probes.
 * Modeled on `app-lock.ts`; Escape consumers stand down while any reason is set.
 */
export function setFloatingLayerReason(reason: string, open: boolean) {
  if (open) {
    openLayers.add(reason);
  } else {
    openLayers.delete(reason);
  }
}

/** Clears every reason — used by tests between cases. */
export function clearFloatingLayerReasons() {
  openLayers.clear();
}

export function isFloatingLayerOpen() {
  return openLayers.size > 0;
}

export function useFloatingLayer(reason: string, open: boolean) {
  useEffect(() => {
    setFloatingLayerReason(reason, open);
    return () => setFloatingLayerReason(reason, false);
  }, [open, reason]);
}
