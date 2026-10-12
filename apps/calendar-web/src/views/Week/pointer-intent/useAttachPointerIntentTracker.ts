import { useEffect } from "react";
import { attachPointerIntentTracker } from "@web/views/Week/pointer-intent/attachPointerIntentTracker";

/** Capture-phase pointer intent on calendar week and day routes. */
export function useAttachPointerIntentTracker(): void {
  useEffect(() => attachPointerIntentTracker(), []);
}
