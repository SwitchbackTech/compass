import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test("description bullet list applies only to the selected lines", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Places list");
  await openTimedEventFormWithKeyboard(page);

  const description = page.getByRole("textbox", { name: "Description" });
  const legacyHtml =
    "<p>LIST<br>- Frames<br>- Art supplies</p><p>PLACES<br>Magpie Art Supply, LLC<br>Paper and Grace<br>Sacks Thrift Store<br>Salvation Army<br>UFS BZN</p>";
  await description.click();
  await page.evaluate((html) => {
    const target = document.activeElement;
    if (!target) {
      throw new Error("description editor not focused");
    }
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/html", html);
    clipboardData.setData("text/plain", "PLACES list");
    target.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, legacyHtml);

  await expect(description).toContainText("PLACES");
  await description.evaluate((root) => {
    const startNeedle = "Magpie Art Supply, LLC";
    const endNeedle = "UFS BZN";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent ?? "";
      if (!startNode) {
        const index = text.indexOf(startNeedle);
        if (index >= 0) {
          startNode = node;
          startOffset = index;
        }
      }
      const endIndex = text.indexOf(endNeedle);
      if (endIndex >= 0) {
        endNode = node;
        endOffset = endIndex + endNeedle.length;
      }
    }
    if (!startNode || !endNode) {
      throw new Error("could not map selection");
    }
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = root.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });

  await page.getByRole("button", { name: "Bullet list" }).click();
  await expect(description.locator("ul > li")).toHaveCount(5);
  await expect(description).toContainText("- Frames");
  await expect(description).toContainText("PLACES");

  await fillTitleAndSaveEventForm(page, title);
  await openEventForEditingWithKeyboard(page, title);
  const descriptionAgain = page.getByRole("textbox", { name: "Description" });
  await expect(descriptionAgain.locator("ul > li")).toHaveCount(5);
});

test("description numbered lists support Enter, exit, and round-trip", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("List notes");
  await openTimedEventFormWithKeyboard(page);

  const description = page.getByRole("textbox", { name: "Description" });
  await description.click();
  await page.getByRole("button", { name: "Numbered list" }).click();

  await page.keyboard.type("First item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Third item");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("After list");

  await expect(description.locator("ol > li")).toHaveCount(3);
  await expect(description.locator("ol + p")).toContainText("After list");

  await fillTitleAndSaveEventForm(page, title);

  await openEventForEditingWithKeyboard(page, title);
  const descriptionAgain = page.getByRole("textbox", { name: "Description" });
  await expect(descriptionAgain.locator("ol > li")).toHaveCount(3);
  await expect(descriptionAgain).toContainText("First item");
  await expect(descriptionAgain).toContainText("Second item");
  await expect(descriptionAgain).toContainText("Third item");
  await expect(descriptionAgain).toContainText("After list");
});
