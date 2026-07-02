import { type CompassStartListening } from "@web/common/store/listener-middleware";
import { registerDayEventQueryListeners } from "@web/ducks/events/listeners/day.event.listener";

/**
 * Registers all listener middleware handlers.
 * Mirrors store/sagas.ts structure for saga registration.
 */
export function registerCompassListeners(
  startListening: CompassStartListening,
) {
  registerDayEventQueryListeners(startListening);
}
