import { z } from "zod";
import { SubscriberStateSchema } from "@core/types/email/email.types";

export const RequestBody_AddTagToSubscriberSchema = z.object({
  email_address: z.string().email(),
});

export type RequestBody_AddTagToSubscriber = z.infer<
  typeof RequestBody_AddTagToSubscriberSchema
>;

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

export const Response_TagSubscriberSchema = z.object({
  subscriber: z.object({
    id: z.number().int(),
    first_name: z.string(),
    email_address: z.string().email(),
    state: SubscriberStateSchema,
    created_at: z.string().datetime(),
    tagged_at: z.string().datetime(),
    fields: z.object({}).optional(),
  }),
});

export type Response_TagSubscriber = z.infer<
  typeof Response_TagSubscriberSchema
>;
