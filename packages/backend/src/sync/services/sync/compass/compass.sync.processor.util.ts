import { z } from "zod";
import {
  CoreEventSchema,
  type Schema_Event_Core,
} from "@core/types/event.types";
import { type applyCompassPlan } from "@backend/event/classes/compass.event.executor";

export type PersistedCompassEvent = Awaited<
  ReturnType<typeof applyCompassPlan>
>["persistedEvent"];
type PersistedCoreEvent = NonNullable<PersistedCompassEvent> &
  Pick<
    Schema_Event_Core,
    "startDate" | "endDate" | "origin" | "priority" | "user"
  >;

const GoogleSyncEventSchema = CoreEventSchema.extend({
  recurrence: CoreEventSchema.shape.recurrence.or(z.null()).optional(),
});

export const isPersistedCoreEvent = (
  event: PersistedCompassEvent,
): event is PersistedCoreEvent =>
  GoogleSyncEventSchema.safeParse(event).success;
