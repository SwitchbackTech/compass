import { expect, type Page, test } from "@playwright/test";

type ViewName = "day" | "week";

const shortcutByView = {
  day: "d",
  week: "w",
} as const satisfies Record<ViewName, string>;

const collectUnexpectedConsoleErrors = (page: Page) => {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (text.includes("Maximum update depth exceeded")) {
      errors.push(text);
    }
  });

  return errors;
};

const viewButton = (page: Page, view: ViewName) => {
  return page
    .getByRole("button", {
      name: new RegExp(`select view, currently ${view}`, "i"),
    })
    .first();
};

const viewOption = (page: Page, view: ViewName) => {
  return page.getByRole("option", {
    name: new RegExp(`^${view}$`, "i"),
  });
};

const expectShortcutHint = async (page: Page, view: ViewName) => {
  await expect(
    viewOption(page, view).getByText(shortcutByView[view], { exact: true }),
  ).toBeVisible();
};

const openViewMenu = async (page: Page, currentView: ViewName) => {
  await expect(viewButton(page, currentView)).toBeVisible();
  await viewButton(page, currentView).click();
  await expect(page.getByTestId("view-select-dropdown")).toBeVisible();
};

test.describe("View dropdown", () => {
  test("opens with the current Week option selected and shortcut hints visible", async ({
    page,
  }) => {
    await page.goto("/week");

    await openViewMenu(page, "week");

    await expect(
      page.getByTestId("view-select-dropdown").getByRole("option"),
    ).toHaveText(["Dayd", "Weekw"]);
    await expect(viewOption(page, "day")).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(viewOption(page, "week")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await expectShortcutHint(page, "day");
    await expectShortcutHint(page, "week");
  });

  test("dismisses with Escape without changing routes", async ({ page }) => {
    await page.goto("/week");

    await openViewMenu(page, "week");
    await page.keyboard.press("Escape");

    await expect(page.getByTestId("view-select-dropdown")).toHaveCount(0);
    await expect(page).toHaveURL(/\/week$/);
    await expect(viewButton(page, "week")).toBeVisible();
  });

  test("selecting the current Week option closes the menu and stays on Week", async ({
    page,
  }) => {
    await page.goto("/week");

    await openViewMenu(page, "week");
    await viewOption(page, "week").click();

    await expect(page.getByTestId("view-select-dropdown")).toHaveCount(0);
    await expect(page).toHaveURL(/\/week$/);
    await expect(viewButton(page, "week")).toBeVisible();
  });

  test("switches from Week to Day and paints the Day view", async ({
    page,
  }) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);

    await page.goto("/week");

    await openViewMenu(page, "week");
    await viewOption(page, "day").click();

    await expect(page).toHaveURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
    await expect(viewButton(page, "day")).toBeVisible();
    await expect(viewButton(page, "week")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("supports keyboard navigation and Enter selection", async ({ page }) => {
    await page.goto("/week");

    await openViewMenu(page, "week");
    await viewOption(page, "week").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
    await expect(viewButton(page, "day")).toBeVisible();
  });
});
