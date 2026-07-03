import { type CompassStartListening } from "@web/common/store/listener-middleware";
import { registerEventListeners } from "@web/ducks/events/listeners/event.listeners";

/**
 * Registers all listener middleware handlers.
 * Central registration point for Redux Toolkit listener middleware.
 */
export function registerCompassListeners(
  startListening: CompassStartListening,
) {
  registerEventListeners(startListening);
}
