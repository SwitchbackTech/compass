import z from "zod";

export const SubscriberStateSchema = z
  .enum(["active", "bounced", "cancelled", "complained", "inactive"])
  .nullable()
  .optional()
  .default("active");
export type SubscriberState = z.infer<typeof SubscriberStateSchema>;

export const SubscriberSchema = z.object({
  email_address: z.string().email(),
  first_name: z.string().nullable().optional(),
  state: SubscriberStateSchema,
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

export type Subscriber = z.infer<typeof SubscriberSchema>;
