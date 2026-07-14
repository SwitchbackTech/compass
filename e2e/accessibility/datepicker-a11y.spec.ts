import { expect, type Locator, test } from "@playwright/test";
import { expectNoAxeViolations } from "../utils/axe-assertion";
import {
  ensureSidebarOpen,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const MIN_NORMAL_TEXT_CONTRAST = 4.5;

test("sidebar datepicker meets baseline accessibility and contrast checks", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  const sidebar = page.locator("#sidebar");
  const monthPicker = sidebar.getByRole("group", { name: "Date navigation" });
  await expect(monthPicker).toBeVisible();

  // Scoped to #sidebar (not a whole-page scan): this test owns the
  // datepicker's targeted contrast regression below, and scoping keeps that
  // pairing - the axe pass and the per-date contrast check - about the same
  // element on every run.
  await expectNoAxeViolations(page, {
    include: "#sidebar",
    checkpoint: "sidebar datepicker",
  });

  const days = monthPicker.locator(
    ".react-datepicker__day:not(.react-datepicker__day--disabled)",
  );
  await expect(days.first()).toBeVisible();

  await expectDateContrast(days, "default");
  await expectDateContrast(days, "hover");
});

const expectDateContrast = async (
  days: Locator,
  state: "default" | "hover",
) => {
  const count = await days.count();

  for (let index = 0; index < count; index++) {
    const day = days.nth(index);
    const text = (await day.textContent())?.trim();
    const box = await day.boundingBox();

    if (!text || !box) {
      continue;
    }

    if (state === "hover") {
      await day.hover();
    }

    const contrast = await getRenderedContrast(day);
    expect(
      contrast.ratio,
      `${state} date ${text} contrast ${contrast.ratio.toFixed(2)}:1 for ${contrast.color} on ${contrast.background}`,
    ).toBeGreaterThanOrEqual(MIN_NORMAL_TEXT_CONTRAST);
  }
};

const getRenderedContrast = (locator: Locator) =>
  locator.evaluate((element) => {
    type Rgba = { a: number; b: number; g: number; r: number };

    const parseRgb = (value: string): Rgba => {
      const match = value.match(
        /rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)(?:\s*,\s*([.\d]+))?\s*\)/,
      );

      if (!match) {
        return { a: 0, b: 0, g: 0, r: 0 };
      }

      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === undefined ? 1 : Number(match[4]),
      };
    };

    const blend = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground.a + background.a * (1 - foreground.a);

      if (alpha === 0) {
        return { a: 0, b: 0, g: 0, r: 0 };
      }

      return {
        r:
          (foreground.r * foreground.a +
            background.r * background.a * (1 - foreground.a)) /
          alpha,
        g:
          (foreground.g * foreground.a +
            background.g * background.a * (1 - foreground.a)) /
          alpha,
        b:
          (foreground.b * foreground.a +
            background.b * background.a * (1 - foreground.a)) /
          alpha,
        a: alpha,
      };
    };

    const formatRgb = ({ b, g, r }: Rgba) =>
      `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

    const channelLuminance = (channel: number) => {
      const ratio = channel / 255;
      return ratio <= 0.03928
        ? ratio / 12.92
        : ((ratio + 0.055) / 1.055) ** 2.4;
    };

    const luminance = ({ b, g, r }: Rgba) =>
      0.2126 * channelLuminance(r) +
      0.7152 * channelLuminance(g) +
      0.0722 * channelLuminance(b);

    const contrastRatio = (foreground: Rgba, background: Rgba) => {
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);

      return (lighter + 0.05) / (darker + 0.05);
    };

    const getRenderedBackground = () => {
      const ancestors: Element[] = [];
      let current: Element | null = element;

      while (current) {
        ancestors.push(current);
        current = current.parentElement;
      }

      const inheritedBackground = ancestors
        .reverse()
        .map((ancestor) => parseRgb(getComputedStyle(ancestor).backgroundColor))
        .reduce<Rgba>(
          (background, foreground) => blend(foreground, background),
          { a: 1, b: 255, g: 255, r: 255 },
        );
      const beforeStyle = getComputedStyle(element, "::before");

      if (beforeStyle.content !== "none") {
        return blend(
          parseRgb(beforeStyle.backgroundColor),
          inheritedBackground,
        );
      }

      return inheritedBackground;
    };

    const style = getComputedStyle(element);
    const background = getRenderedBackground();
    const color = blend(parseRgb(style.color), background);

    return {
      background: formatRgb(background),
      color: formatRgb(color),
      ratio: contrastRatio(color, background),
    };
  });
