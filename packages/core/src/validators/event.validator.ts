import {
  type LegacyEvent,
  type ValidatedLegacyEvent,
  ValidatedLegacyEventSchema,
} from "@core/types/legacy-event.contracts";

export const validateEvent = (event: LegacyEvent): ValidatedLegacyEvent => {
  const result = ValidatedLegacyEventSchema.parse(event);
  return result;
};
