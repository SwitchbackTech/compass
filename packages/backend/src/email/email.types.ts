import { z } from "zod";

const SubscriberState = z
  .enum(["active", "bounced", "cancelled", "complained", "inactive"])
  .nullable()
  .optional()
  .default("active");

export const RequestBody_CreateSubscriberSchema = z.object({
  email_address: z.string().email("Valid email required"),
  first_name: z.string().nullable().optional(),
  state: SubscriberState,
  fields: z.object({
    "Last name": z.string(),
    Birthday: z.string(),
    Source: z.string(),
    Role: z.string().optional(),
    Company: z.string().optional(),
    "Postal code": z.string().optional(),
    Website: z.string().optional(),
    "Social media": z.string().optional(),
    "How did you hear about us?": z.string().optional(),
    Interests: z.string().optional(),
    Coupon: z.string().optional(),
  }),
});

export type RequestBody_CreateSubscriber = z.infer<
  typeof RequestBody_CreateSubscriberSchema
>;

export const Response_UpsertSubscriberSchema = z.object({
  subscriber: z.object({
    id: z.number().int(),
    first_name: z.string(),
    email_address: z.string().email(),
    state: SubscriberState,
    created_at: z.string().datetime(),
    fields: z.object({}).optional(),
  }),
});

export type Response_UpsertSubscriber = z.infer<
  typeof Response_UpsertSubscriberSchema
>;

export const Response_TagSubscriberSchema = z.object({
  subscriber: z.object({
    id: z.number().int(),
    first_name: z.string(),
    email_address: z.string().email(),
    state: SubscriberState,
    created_at: z.string().datetime(),
    tagged_at: z.string().datetime(),
    fields: z.object({}).optional(),
  }),
});

export type Response_TagSubscriber = z.infer<
  typeof Response_TagSubscriberSchema
>;
