import { z } from "zod";
import { Categories_Event } from "@core/types/event.types";

export interface RecurrenceWithRule {
  rule?: string[] | null;
  eventId?: string;
}

const SomedayCategory = z.enum([
  Categories_Event.SOMEDAY_WEEK,
  Categories_Event.SOMEDAY_MONTH,
]);

const SomedayFreq: Record<
  z.infer<typeof SomedayCategory>,
  "WEEKLY" | "MONTHLY"
> = {
  [Categories_Event.SOMEDAY_WEEK]: "WEEKLY",
  [Categories_Event.SOMEDAY_MONTH]: "MONTHLY",
};

const RecurrenceRules = z.array(z.string());

/**
 * Rewrites the FREQ of each RRULE line so a converted Someday event recurs at
 * its destination list's cadence (weekly for the week list, monthly for the
 * month list). Non-RRULE lines (EXDATE, etc.) pass through untouched. Returns
 * the recurrence unchanged when there is no rule.
 */
export const rewriteRecurrenceFreq = (
  recurrence: RecurrenceWithRule | undefined,
  category: z.infer<typeof SomedayCategory>,
): RecurrenceWithRule | undefined => {
  if (!recurrence?.rule) {
    return recurrence;
  }

  const freq = SomedayFreq[SomedayCategory.parse(category)];
  const rule = RecurrenceRules.parse(recurrence.rule).map((line) =>
    line.startsWith("RRULE:") ? line.replace(/FREQ=\w+/, `FREQ=${freq}`) : line,
  );

  return { ...recurrence, rule };
};
