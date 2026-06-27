import { useSyncExternalStore } from "react";
import { maxGridZIndexStore } from "@web/common/utils/dom/grid-organization.util";

export function useGridMaxZIndex() {
  return useSyncExternalStore(
    maxGridZIndexStore.subscribe,
    maxGridZIndexStore.get,
  );
}
