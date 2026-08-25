import { z } from "zod/v4";

// Attendance vocabulary shared by the canonical Sync contract and the
// app-facing Event contract: provider-sourced read shapes plus the write-input
// shapes for editing the guest list and answering an invitation. Standalone
// (no dependency on either event.contracts.ts or sync/event.contracts.ts) so
// both can import it without a circular import, mirroring
// event-color.contracts.ts.

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

// Write-input shape for one guest-list entry. Callers name attendees but never
// set another person's RSVP, so responseStatus is deliberately absent — the
// strict object rejects it. RSVP state is provider-owned and arrives via the
// read path (AttendeeSchema).
export const AttendeeInputSchema = z.strictObject({
  email: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(256).nullable(),
});
export type AttendeeInput = z.infer<typeof AttendeeInputSchema>;

// Array refine helper: guest membership is keyed by email and providers treat
// emails case-insensitively, so one email may appear at most once per list
// regardless of case.
export const uniqueAttendeeEmails = (
  attendees: ReadonlyArray<Pick<AttendeeInput, "email">>,
): boolean =>
  new Set(attendees.map(({ email }) => email.toLowerCase())).size ===
  attendees.length;

// The statuses a user may set on their own attendance. `needsAction` is the
// provider's "no answer yet" state — readable but never choosable, so RSVP
// inputs exclude it.
export const RsvpResponseStatusSchema = AttendeeResponseStatusSchema.exclude([
  "needsAction",
]);
export type RsvpResponseStatus = z.infer<typeof RsvpResponseStatusSchema>;

export const ConferenceSchema = z.strictObject({
  url: z.url(),
  label: z.string().trim().min(1).max(256).nullable(),
});
export type Conference = z.infer<typeof ConferenceSchema>;
