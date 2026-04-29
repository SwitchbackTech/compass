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
