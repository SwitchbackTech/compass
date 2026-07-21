import { z } from "zod";
import { SubscriberStateSchema } from "@core/types/email/email.types";

export const Response_UpsertSubscriberSchema = z.object({
  subscriber: z.object({
    id: z.number().int(),
    first_name: z.string(),
    email_address: z.string().email(),
    state: SubscriberStateSchema,
    created_at: z.string().datetime(),
    fields: z.object({}).optional(),
  }),
});

export type Response_UpsertSubscriber = z.infer<
  typeof Response_UpsertSubscriberSchema
>;

export const Response_ListSubscribersSchema = z.object({
  subscribers: z.array(
    z.object({
      id: z.number().int(),
      email_address: z.string().email(),
      state: SubscriberStateSchema,
    }),
  ),
});

export type Response_ListSubscribers = z.infer<
  typeof Response_ListSubscribersSchema
>;
