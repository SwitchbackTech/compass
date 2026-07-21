import z from "zod";

export const SubscriberStateSchema = z
  .enum(["active", "bounced", "cancelled", "complained", "inactive"])
  .nullable()
  .optional()
  .default("active");
export type SubscriberState = z.infer<typeof SubscriberStateSchema>;

/** The current user's email-update state, as reported by Kit. */
export const EmailUpdatesStatusSchema = z.enum([
  "unavailable",
  "not_subscribed",
  "subscribed",
  "unsubscribed",
]);
export type EmailUpdatesStatus = z.infer<typeof EmailUpdatesStatusSchema>;

export const EmailUpdatesResponseSchema = z.strictObject({
  status: EmailUpdatesStatusSchema,
});
export type EmailUpdatesResponse = z.infer<typeof EmailUpdatesResponseSchema>;

// Keep this up-to-date with: https://developers.kit.com/api-reference/subscribers/create-a-subscriber
export const SubscriberSchema = z.object({
  email_address: z.string().email(),
  first_name: z.string().nullable().optional(),
  state: SubscriberStateSchema,
  fields: z
    .object({
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
    })
    .nullable(),
});

export type Subscriber = z.infer<typeof SubscriberSchema>;
