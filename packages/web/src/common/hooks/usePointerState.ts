import { useSyncExternalStore } from "react";
import {
  type PointerState,
  pointerStateStore,
} from "@web/common/context/pointer-position";

export function usePointerState(): PointerState {
  return useSyncExternalStore(
    pointerStateStore.subscribe,
    pointerStateStore.get,
  );
}
