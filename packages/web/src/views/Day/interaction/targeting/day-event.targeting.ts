import { createGridEventTargeting } from "@web/grid/interaction/event.targeting";
import {
  DAY_INTERACTION_EVENT_ID_ATTRIBUTE,
  DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type DayInteractionEventType,
  dayEventRegistry,
} from "@web/views/Day/interaction/registry/day-event.registry";

export const dayEventTargeting =
  createGridEventTargeting<DayInteractionEventType>({
    registry: dayEventRegistry,
    targetSelector: `[${DAY_INTERACTION_EVENT_ID_ATTRIBUTE}][${DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`,
  });
