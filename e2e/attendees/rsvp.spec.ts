import { expect, test } from "@playwright/test";
import {
  ACCOUNT_EMAIL,
  buildEventFixture,
  dispatchClick,
  openEventForm,
  prepareSignedInGooglePage,
} from "./attendee-harness";

// RSVP control end-to-end (WP-07/08/WP-09): the Going / Maybe / Decline
// radiogroup on an event the account is invited to, the per-occurrence
// "This Event" / "All Events" scope dialog, and the exact POST
// /api/event/:id/rsvp payloads — including the composite occurrence id on
// the URL.

const RECURRENCE_ID = "2026-08-26T10:00:00.000Z";
const SERIES_ID = "evt-series-1";
const OCCURRENCE_ID = `${SERIES_ID}::${RECURRENCE_ID}`;

const invitedSingleEvent = () =>
  buildEventFixture({
    id: "evt-invite-1",
    title: "Team Offsite",
    organizer: { email: "boss@example.com", displayName: "The Boss" },
    attendees: [
      {
        email: "boss@example.com",
        displayName: null,
        responseStatus: "accepted",
      },
      {
        email: ACCOUNT_EMAIL,
        displayName: null,
        responseStatus: "needsAction",
      },
    ],
  });

const invitedOccurrence = () =>
  buildEventFixture({
    id: OCCURRENCE_ID,
    title: "Weekly Standup",
    organizer: { email: "boss@example.com", displayName: "The Boss" },
    recurrence: { kind: "occurrence", seriesId: SERIES_ID },
    attendees: [
      {
        email: "boss@example.com",
        displayName: null,
        responseStatus: "accepted",
      },
      { email: ACCOUNT_EMAIL, displayName: null, responseStatus: "tentative" },
    ],
  });

const getRsvpGroup = (page: import("@playwright/test").Page) =>
  page.getByRole("radiogroup", { name: "Going?" });

test("answering a single event posts immediately with scope single and no dialog", async ({
  page,
}) => {
  const captured = await prepareSignedInGooglePage(page, {
    events: [invitedSingleEvent()],
  });

  await openEventForm(page, "Team Offsite");

  const group = getRsvpGroup(page);
  await expect(group).toBeVisible();
  // Unanswered (needsAction): no radio is checked yet.
  await expect(group.getByRole("radio", { name: "Going" })).not.toBeChecked();
  await expect(group.getByRole("radio", { name: "Maybe" })).not.toBeChecked();
  await expect(group.getByRole("radio", { name: "Decline" })).not.toBeChecked();

  await dispatchClick(group.getByRole("radio", { name: "Maybe" }));

  // Single event: no scope dialog, the answer goes straight to the wire.
  await expect(page.getByText("Respond for")).toHaveCount(0);
  await expect.poll(() => captured.rsvpRequests.length).toBe(1);
  expect(captured.rsvpRequests[0]).toEqual({
    eventId: "evt-invite-1",
    body: { responseStatus: "tentative", scope: "single" },
  });

  // The optimistic self-entry rewrite paints the answer immediately.
  await expect(group.getByRole("radio", { name: "Maybe" })).toBeChecked();
});

test("answering an occurrence offers This Event / All Events (never this-and-following) and posts the occurrence id on scope single", async ({
  page,
}) => {
  const captured = await prepareSignedInGooglePage(page, {
    events: [invitedOccurrence()],
  });

  await openEventForm(page, "Weekly Standup");

  const group = getRsvpGroup(page);
  await expect(group).toBeVisible();
  await expect(group.getByRole("radio", { name: "Maybe" })).toBeChecked();

  await dispatchClick(group.getByRole("radio", { name: "Decline" }));

  // The scope dialog opens BEFORE anything reaches the wire.
  const dialog = page.getByRole("radiogroup", { name: "Respond for" });
  await expect(dialog).toBeVisible();
  expect(captured.rsvpRequests).toHaveLength(0);

  // Exactly two choices; an RSVP has no this-and-following semantics.
  await expect(dialog.getByRole("radio")).toHaveCount(2);
  await expect(dialog.getByRole("radio", { name: "This Event" })).toBeChecked();
  await expect(
    dialog.getByRole("radio", { name: "All Events" }),
  ).not.toBeChecked();
  await expect(page.getByText(/following/i)).toHaveCount(0);

  await dispatchClick(page.getByRole("button", { name: "Ok" }));

  // Scope "single" answers just this occurrence: the composite
  // eventId::recurrenceId rides the URL so the backend addresses exactly it.
  await expect.poll(() => captured.rsvpRequests.length).toBe(1);
  expect(captured.rsvpRequests[0]).toEqual({
    eventId: OCCURRENCE_ID,
    body: { responseStatus: "declined", scope: "single" },
  });
  await expect(dialog).toHaveCount(0);
});

test("choosing All Events posts scope all, and cancelling sends nothing", async ({
  page,
}) => {
  const captured = await prepareSignedInGooglePage(page, {
    events: [invitedOccurrence()],
  });

  await openEventForm(page, "Weekly Standup");
  const group = getRsvpGroup(page);

  // Cancel first: the dialog closes and nothing was posted.
  await dispatchClick(group.getByRole("radio", { name: "Going" }));
  const dialog = page.getByRole("radiogroup", { name: "Respond for" });
  await expect(dialog).toBeVisible();
  await dispatchClick(page.getByRole("button", { name: "Cancel" }));
  await expect(dialog).toHaveCount(0);
  expect(captured.rsvpRequests).toHaveLength(0);

  // Then answer for the whole series.
  await dispatchClick(group.getByRole("radio", { name: "Going" }));
  await expect(dialog).toBeVisible();
  await dispatchClick(dialog.getByRole("radio", { name: "All Events" }));
  await dispatchClick(page.getByRole("button", { name: "Ok" }));

  await expect.poll(() => captured.rsvpRequests.length).toBe(1);
  expect(captured.rsvpRequests[0]).toEqual({
    eventId: OCCURRENCE_ID,
    body: { responseStatus: "accepted", scope: "all" },
  });
});
