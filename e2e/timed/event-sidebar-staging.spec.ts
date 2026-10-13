import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareTimedCalendarPage,
} from "../utils/event-test-utils";

test("description links are focusable and copy with Mod+Shift+C", async ({
  page,
}) => {
  await prepareTimedCalendarPage(page);

  const title = createEventTitle("Link copy");
  const linkUrl = "https://example.com/meeting-room";

  await openTimedEventFormWithKeyboard(page);
  await page.getByRole("textbox", { name: "Description" }).click();
  await page
    .getByRole("textbox", { name: "Description" })
    .evaluate((node, html) => {
      node.innerHTML = html;
      node.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }, `<p>Join <a href="${linkUrl}">here</a></p>`);

  await fillTitleAndSaveEventForm(page, title);
  await openEventForEditingWithKeyboard(page, title);

  const link = page.getByRole("link", { name: "here" });
  await link.focus();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __copied?: string }).__copied = "";
    navigator.clipboard.writeText = async (text: string) => {
      (window as unknown as { __copied?: string }).__copied = text;
    };
  });

  await link.click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as unknown as { __copied?: string }).__copied,
      ),
    )
    .toBe(linkUrl);

  await page.keyboard.press(
    `${process.platform === "darwin" ? "Meta" : "Control"}+Shift+C`,
  );
  await expect(page.getByText("Link copied")).toBeVisible();
});

test("provider-managed schedule shows a Google Calendar toast on click", async ({
  page,
}) => {
  await prepareTimedCalendarPage(page);

  const title = createEventTitle("Managed flight");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);

  await page.evaluate(async (eventTitle) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("compass-local");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const records = await new Promise<
      Array<{
        id: string;
        event: { content: { title?: string }; providerManaged?: true };
      }>
    >((resolve, reject) => {
      const tx = db.transaction("events", "readonly");
      const req = tx.objectStore("events").getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });

    const record = records.find(
      (row) =>
        row.event.content &&
        "title" in row.event.content &&
        row.event.content.title === eventTitle,
    );
    if (!record) throw new Error("event not found in local db");

    record.event.providerManaged = true;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, title);

  await page.reload({ waitUntil: "domcontentloaded" });
  await openEventForEditingWithKeyboard(page, title);

  await expect(
    page.getByText(
      "Your calendar provider keeps this event updated (for example from an email)",
    ),
  ).toHaveCount(0);

  const schedule = page.getByRole("group", { name: "Event schedule" });
  await schedule.click({ force: true });
  await expect(
    page.getByText("This time is managed by Google Calendar."),
  ).toBeVisible();
});
