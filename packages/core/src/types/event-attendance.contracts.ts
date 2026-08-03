import { z } from "zod/v4";

// Provider-sourced, read-only event fields shared by the canonical Sync
// contract and the app-facing Event contract. Standalone (no dependency on
// either event.contracts.ts or sync/event.contracts.ts) so both can import
// it without a circular import, mirroring event-color.contracts.ts.

export const OrganizerSchema = z.strictObject({
  email: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(256).nullable(),
});
export type Organizer = z.infer<typeof OrganizerSchema>;

export const AttendeeResponseStatusSchema = z.enum([
  "needsAction",
  "accepted",
  "declined",
  "tentative",
]);
export type AttendeeResponseStatus = z.infer<
  typeof AttendeeResponseStatusSchema
>;

export const AttendeeSchema = z.strictObject({
  email: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(256).nullable(),
  responseStatus: AttendeeResponseStatusSchema,
});
export type Attendee = z.infer<typeof AttendeeSchema>;

export const ConferenceSchema = z.strictObject({
  url: z.url(),
  label: z.string().trim().min(1).max(256).nullable(),
});
export type Conference = z.infer<typeof ConferenceSchema>;
