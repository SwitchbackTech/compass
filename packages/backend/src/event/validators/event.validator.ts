import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { z } from "zod";

const eventSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  origin: z.nativeEnum(Origin),
  priority: z.nativeEnum(Priorities),
  user: z.string(),
  // TODO: Consider adding additional fields?
});

type ValidationResult = z.SafeParseReturnType<
  z.infer<typeof eventSchema>,
  z.infer<typeof eventSchema>
>;

export const validateEvent = (event: Schema_Event): ValidationResult => {
  return eventSchema.safeParse(event);
};
