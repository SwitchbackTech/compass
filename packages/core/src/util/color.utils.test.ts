import tinycolor from "tinycolor2";
import {
  brighten,
  darken,
  generateCalendarColorScheme,
  isDark,
} from "./color.utils";

describe("color.utils", () => {
  describe("brighten", () => {
    it("brightens color by specified amount", () => {
      const color = "#123456";
      const amount = 15;
      const expected = tinycolor(color).brighten(amount).toString();

      expect(brighten(color, amount)).toBe(expected);
    });

    it("brightens color using default amount when not provided", () => {
      const color = "#808080";
      const expected = tinycolor(color).brighten().toString();

      expect(brighten(color)).toBe(expected);
    });
  });

  describe("darken", () => {
    it("darkens color by specified amount", () => {
      const color = "#abcdef";
      const amount = 20;
      const expected = tinycolor(color).darken(amount).toString();

      expect(darken(color, amount)).toBe(expected);
    });

    it("darkens color using default amount when not provided", () => {
      const color = "#f0f0f0";
      const expected = tinycolor(color).darken().toString();

      expect(darken(color)).toBe(expected);
    });
  });

  describe("isDark", () => {
    it("identifies dark colors correctly", () => {
      expect(isDark("#000000")).toBe(true);
    });

    it("identifies light colors correctly", () => {
      expect(isDark("#ffffff")).toBe(false);
    });
  });

  describe("calendarColor", () => {
    it("returns color values derived from provided color", () => {
      const color = tinycolor.random().toHexString();
      const base = tinycolor(color);
      const result = generateCalendarColorScheme(color);

      expect(result.backgroundColor).toBe(base.toHexString());
      expect(tinycolor(result.color).isValid()).toBe(true);
    });

    it("generates color values from random color when not provided", () => {
      const color = tinycolor.random();
      const randomColorSpy = jest.spyOn(tinycolor, "random");

      randomColorSpy.mockReturnValue(color);

      const result = generateCalendarColorScheme();

      expect(randomColorSpy).toHaveBeenCalled();
      expect(randomColorSpy.mock.results).toEqual(
        expect.arrayContaining([{ type: "return", value: color }]),
      );

      expect(result.backgroundColor).toBe(color.toHexString());
      expect(tinycolor(result.color).isValid()).toBe(true);

      randomColorSpy.mockRestore();
    });

    it("ensures returned colors remain readable for provided color", () => {
      const providedColor = tinycolor.random().toHexString();
      const { backgroundColor, color } =
        generateCalendarColorScheme(providedColor);
      const readability = tinycolor.isReadable(backgroundColor, color);

      expect(readability).toBe(true);
    });

    it("ensures returned colors remain readable for random color", () => {
      const randomColor = tinycolor.random();
      const randomColorSpy = jest.spyOn(tinycolor, "random");

      randomColorSpy.mockReturnValue(randomColor);

      const { backgroundColor, color } = generateCalendarColorScheme();
      const readability = tinycolor.isReadable(backgroundColor, color);

      expect(randomColorSpy).toHaveBeenCalled();
      expect(randomColorSpy.mock.results).toEqual(
        expect.arrayContaining([{ type: "return", value: randomColor }]),
      );

      expect(readability).toBe(true);
    });
  });
});
