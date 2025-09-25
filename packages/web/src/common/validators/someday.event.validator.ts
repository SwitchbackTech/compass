import {
  DraftEventSchema,
  Schema_DraftEvent,
} from "../schemas/events/draft.event.schemas";
import {
  Schema_SomedayEvent,
  SomedayEventSchema,
} from "../schemas/events/someday.event.schemas";
import { Schema_WebEvent } from "../schemas/events/web.event.schemas";

export const validateSomedayDraft = (
  draft: Schema_DraftEvent,
): Schema_DraftEvent => {
  const result = DraftEventSchema.parse(draft);
  return result;
};

export const validateSomedayEvent = (
  event: Schema_WebEvent,
): Schema_SomedayEvent => {
  const result = SomedayEventSchema.parse(event);
  return result;
};

export const validateSomedayEvents = (
  events: Schema_WebEvent[],
): Schema_SomedayEvent[] => {
  const results = events.map((event) => validateSomedayEvent(event));
  return results;
};
