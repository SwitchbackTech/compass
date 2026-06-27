import { useSyncExternalStore } from "react";
import { cursorStore } from "@web/common/context/pointer-position";

export function useCursorCoordinates() {
  return useSyncExternalStore(cursorStore.subscribe, cursorStore.get);
}
