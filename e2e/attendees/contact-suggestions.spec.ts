import { expect, test } from "@playwright/test";
import {
  ACCOUNT_EMAIL,
  buildEventFixture,
  dispatchClick,
  getGuestCombobox,
  openEventForm,
  prepareSignedInGooglePage,
} from "./attendee-harness";

// Contact-suggestion picker end-to-end (WP-05/06/WP-09) against a stubbed
// suggestions endpoint: the ≥2-char minimum keeps single keystrokes off the
// wire, the 250ms debounce collapses fast typing to one query, and a picked
// suggestion becomes a guest chip carrying its display name.

const organizedEvent = () =>
  buildEventFixture({
    id: "evt-suggest-1",
    title: "Planning Sync",
    attendees: [
      { email: ACCOUNT_EMAIL, displayName: null, responseStatus: "accepted" },
    ],
  });

test("suggests contacts from the stubbed endpoint after the min-length and debounce gates, and picking one adds a chip", async ({
  page,
}) => {
  const captured = await prepareSignedInGooglePage(page, {
    events: [organizedEvent()],
    canSuggestContacts: true,
    suggestions: [
      { email: "alan@example.com", displayName: "Alan Partridge" },
      { email: "alice@example.com", displayName: "Alice A" },
    ],
  });

  await openEventForm(page, "Planning Sync");

  const combobox = getGuestCombobox(page);
  await combobox.click();
  // One character: below CONTACT_SUGGESTION_QUERY_MIN_LENGTH (2). Wait out
  // the 250ms debounce window (poll, not a bare sleep) and assert that no
  // request left the browser.
  await combobox.fill("a");
  const typedAt = Date.now();
  await expect
    .poll(() =>
      Date.now() - typedAt > 600 ? captured.suggestionQueries.length : -1,
    )
    .toBe(0);

  // Second character crosses the minimum: exactly one debounced query for
  // the final text goes out, and the stubbed page renders as options.
  await combobox.pressSequentially("l");
  await expect(page.getByText("Alan Partridge")).toBeVisible();
  await expect(page.getByText("Alice A")).toBeVisible();
  expect(captured.suggestionQueries).toEqual(["al"]);

  await dispatchClick(page.getByText("Alan Partridge"));

  // The picked suggestion is now a chip (labelled by display name) and the
  // input reset closed the listbox.
  await expect(
    page.getByRole("button", { name: "Remove Alan Partridge" }),
  ).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
