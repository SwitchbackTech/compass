import { isEventFormOpen } from "@web/events/stores/draft.store";
import { isFloatingLayerOpen } from "@web/shortcuts/floating-layer";

/** True when Escape should dismiss a modal/form/layer before lower-priority handlers. */
export function isHigherEscapeOwner(): boolean {
  return (
    document.body.dataset.appLocked === "true" ||
    isFloatingLayerOpen() ||
    isEventFormOpen()
  );
}
