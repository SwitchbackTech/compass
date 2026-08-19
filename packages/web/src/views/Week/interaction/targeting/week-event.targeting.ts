import { createGridEventTargeting } from "@web/grid/interaction/event.targeting";
import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type WeekInteractionEventType,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/week-event.registry";

export const weekEventTargeting =
  createGridEventTargeting<WeekInteractionEventType>({
    registry: weekEventRegistry,
    targetSelector: `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`,
  });
