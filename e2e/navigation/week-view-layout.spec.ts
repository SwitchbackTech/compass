import { expect, test } from "@playwright/test";

const compactDesktopWidths = [1180, 1024, 900];
const weekDayTitles = [
  "20260426",
  "20260427",
  "20260428",
  "20260429",
  "20260430",
  "20260501",
  "20260502",
];

test.describe("Week view layout", () => {
  for (const width of compactDesktopWidths) {
    test(`keeps day headers aligned with timed grid columns at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/week");
      await page.locator("#mainGrid").waitFor();

      const layout = await page.evaluate((titles) => {
        const roundRect = (rect: DOMRect) => ({
          height: Math.round(rect.height * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          x: Math.round(rect.x * 100) / 100,
        });

        const dayLabels = titles.map((title) => {
          const node = document.querySelector(`[title="${title}"]`);
          if (!(node instanceof HTMLElement)) {
            throw new Error(`Missing day label ${title}`);
          }

          const numberNode = node.querySelector("span");
          const rect = roundRect(node.getBoundingClientRect());

          return {
            ...rect,
            fontSize:
              numberNode instanceof HTMLElement
                ? Number.parseFloat(getComputedStyle(numberNode).fontSize)
                : undefined,
          };
        });

        const gridColumnCandidates = [
          ...document.querySelectorAll("#mainGrid > div:nth-of-type(2) > div"),
        ];

        const gridColumns = gridColumnCandidates
          .map((node) => roundRect(node.getBoundingClientRect()))
          .filter((rect) => rect.height > 100)
          .slice(0, titles.length);

        return { dayLabels, gridColumns };
      }, weekDayTitles);

      expect(layout.gridColumns).toHaveLength(weekDayTitles.length);

      for (const [index, dayLabel] of layout.dayLabels.entries()) {
        const gridColumn = layout.gridColumns[index];
        expect(Math.abs(dayLabel.x - gridColumn.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(dayLabel.width - gridColumn.width)).toBeLessThanOrEqual(
          1,
        );
      }
    });
  }

  test("keeps day headers aligned with all-day and timed grid columns on wide desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1728, height: 1426 });
    await page.goto("/week");
    await page.locator("#mainGrid").waitFor();
    await page.locator("#allDayColumns").waitFor();

    const layout = await page.evaluate((titles) => {
      const roundRect = (rect: DOMRect) => ({
        height: Math.round(rect.height * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        x: Math.round(rect.x * 100) / 100,
      });

      const dayLabels = titles.map((title) => {
        const node = document.querySelector(`[title="${title}"]`);
        if (!(node instanceof HTMLElement)) {
          throw new Error(`Missing day label ${title}`);
        }
        return roundRect(node.getBoundingClientRect());
      });

      // #allDayColumns must have exactly the 7 day-column <div>s as direct
      // children. The toHaveLength(7) assertion below catches wrapper drift.
      const allDayColumns = [
        ...document.querySelectorAll("#allDayColumns > div"),
      ]
        .map((node) => roundRect(node.getBoundingClientRect()))
        .filter((rect) => rect.width > 0);

      // Note: #mainGrid > div:nth-of-type(2) is fragile — any structural
      // change inside MainGrid will silently change which container this
      // matches. If this selector breaks, prefer adding a stable id over
      // guessing nth-of-type indices.
      const timedColumnContainer = document.querySelector(
        "#mainGrid > div:nth-of-type(2)",
      );
      if (!(timedColumnContainer instanceof HTMLElement)) {
        throw new Error("Missing timed grid column container");
      }

      const timedColumns = [...timedColumnContainer.children]
        .map((node) => roundRect(node.getBoundingClientRect()))
        .filter((rect) => rect.height > 100)
        .slice(0, titles.length);

      return { allDayColumns, dayLabels, timedColumns };
    }, weekDayTitles);

    expect(layout.allDayColumns).toHaveLength(weekDayTitles.length);
    expect(layout.timedColumns).toHaveLength(weekDayTitles.length);

    for (const [index, dayLabel] of layout.dayLabels.entries()) {
      for (const gridColumn of [
        layout.allDayColumns[index],
        layout.timedColumns[index],
      ]) {
        expect(Math.abs(dayLabel.x - gridColumn.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(dayLabel.right - gridColumn.right)).toBeLessThanOrEqual(
          1,
        );
        expect(Math.abs(dayLabel.width - gridColumn.width)).toBeLessThanOrEqual(
          1,
        );
      }
    }

    // The all-day band's divider must hug the day-column track, not the full
    // mainGrid (which is 50px wider on the left and 8px on the right due to
    // the time gutter and scrollbar reservation). It is drawn as a pseudo
    // element so vertical grid lines remain visible at the intersection.
    const allDayDivider = await page.evaluate(() => {
      const borderWidth = (sel: string) => {
        const el = document.querySelector(sel);
        if (!(el instanceof HTMLElement)) {
          throw new Error(`Missing ${sel}`);
        }
        return Number.parseFloat(getComputedStyle(el).borderBottomWidth || "0");
      };
      const allDayColumns = document.querySelector("#allDayColumns");
      if (!(allDayColumns instanceof HTMLElement)) {
        throw new Error("Missing #allDayColumns");
      }
      const dividerStyle = getComputedStyle(allDayColumns, "::before");
      return {
        columnsBorder: borderWidth("#allDayColumns"),
        dividerHeight: Number.parseFloat(dividerStyle.height || "0"),
        rowBorder: borderWidth("#allDayRow"),
      };
    });
    expect(allDayDivider.rowBorder).toBe(0);
    expect(allDayDivider.columnsBorder).toBe(0);
    expect(allDayDivider.dividerHeight).toBeGreaterThan(0);
  });

  test("uses compact day-header type when the week track is narrow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.goto("/week");
    await page.locator("#mainGrid").waitFor();

    const fontSizes = await page.evaluate((titles) => {
      return titles.map((title) => {
        const node = document.querySelector(`[title="${title}"] span`);
        if (!(node instanceof HTMLElement)) {
          throw new Error(`Missing day label number ${title}`);
        }

        return Number.parseFloat(getComputedStyle(node).fontSize);
      });
    }, weekDayTitles);

    for (const fontSize of fontSizes) {
      expect(fontSize).toBeLessThanOrEqual(18);
    }
  });
});
