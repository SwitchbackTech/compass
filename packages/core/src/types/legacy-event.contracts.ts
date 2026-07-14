import { z } from "zod/v4";
import { Origin } from "@core/constants/core.constants";
import { IDSchemaV4 } from "@core/types/type.utils";

/**
 * Legacy event shape (pre-EventRecord cutover). All fields optional; this is
 * the shape events take before they're validated for persistence/sync.
 */
export const LegacyEventSchema = z.object({
  _id: z.string().optional(),
  allDayOrder: z.number().optional(),
  description: z.string().nullable().optional(),
  endDate: z.string().optional(),
  isAllDay: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  order: z.number().optional(),
  origin: z.enum(Origin).optional(),
  recurrence: z
    .object({
      rule: z.array(z.string()).nullable().optional(),
      eventId: z.string().optional(),
    })
    .optional(),
  startDate: z.string().optional(),
  title: z.string().optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
  user: z.string().optional(),
});
export type LegacyEvent = z.infer<typeof LegacyEventSchema>;

export type StandaloneEvent = Omit<
  LegacyEvent,
  "recurrence" | "gRecurringEventId"
>;

export type BaseEvent = Omit<
  LegacyEvent,
  "recurrence" | "gRecurringEventId"
> & {
  recurrence: { rule: string[] }; // no eventId: this IS the base
};

export type InstanceEvent = Omit<LegacyEvent, "recurrence"> & {
  recurrence: { eventId: string }; // no rule: points at the base event
};

const LegacyEventDateSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.date(),
]);

/**
 * Strict legacy event: what gets validated before persistence/sync. Field
 * set deliberately excludes order/allDayOrder so .parse() keeps stripping
 * those fields, same as before this refactor.
 */
export const ValidatedLegacyEventSchema = z.object({
  _id: IDSchemaV4.optional(),
  description: z.string().nullable().optional(),
  endDate: LegacyEventDateSchema,
  isAllDay: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  origin: z.enum(Origin),
  recurrence: z
    .object({
      rule: z.array(z.string()).optional(),
      eventId: z.string().optional(),
    })
    .optional(),
  startDate: LegacyEventDateSchema,
  title: z.string().optional(),
  updatedAt: z.union([z.date(), z.iso.datetime()]).optional(),
  user: z.string(),
});
export type ValidatedLegacyEvent = z.infer<typeof ValidatedLegacyEventSchema>;
