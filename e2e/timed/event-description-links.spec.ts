import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareTimedCalendarPage,
} from "../utils/event-test-utils";

test("description links shorten, keep hover copy, and open from shortcuts", async ({
  page,
}) => {
  await prepareTimedCalendarPage(page);

  const title = createEventTitle("Description links");
  const firstUrl = "https://one.example/meeting/a";
  const secondUrl = "https://two.example/meeting/b";

  await openTimedEventFormWithKeyboard(page);
  const description = page.getByRole("textbox", { name: "Description" });
  await description.click();
  await description.pressSequentially(`${firstUrl} then ${secondUrl}`, {
    delay: 10,
  });
  await fillTitleAndSaveEventForm(page, title);
  await openEventForEditingWithKeyboard(page, title);

  const links = page.locator(".tiptap a");
  await expect(links.first()).toHaveText("one.example");
  await expect(links.first()).toHaveAttribute("title", firstUrl);

  await links.first().hover();
  const copyButton = page.getByRole("button", { name: "Copy link" });
  await expect(copyButton).toBeVisible();
  await copyButton.hover();
  await expect(copyButton).toBeVisible();
  await copyButton.click();
  await expect(page.getByText("Link copied")).toBeVisible();

  await page.getByLabel("Title").click();
  await expect(page.getByText("1", { exact: true })).toBeVisible();

  const opened: string[] = [];
  await page.exposeFunction("recordOpened", (url: string) => {
    opened.push(url);
  });
  await page.evaluate(() => {
    window.open = (url?: string | URL) => {
      (
        window as unknown as { recordOpened: (url: string) => void }
      ).recordOpened(String(url ?? ""));
      return null;
    };
  });

  await page.keyboard.press("2");
  await expect.poll(() => opened.at(-1)).toBe(secondUrl);

  await description.click();
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+Shift+Enter`);
  await expect.poll(() => opened.at(-1)).toMatch(/one\.example|two\.example/);

  await description.click();
  await description.press(`${mod}+a`);
  const savedHtml = await description.innerHTML();
  expect(savedHtml).toContain(firstUrl);
  expect(savedHtml).toContain(secondUrl);
});
