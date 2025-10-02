import { MouseEvent } from "react";
import { isLeftClick, isRightClick } from "./mouse.util";

describe("mouse.util", () => {
  describe("isRightClick", () => {
    it("should return true for right click (button === 2)", () => {
      const mockEvent = {
        button: 2,
      } as MouseEvent;

      expect(isRightClick(mockEvent)).toBe(true);
    });

    it("should return false for left click (button === 0)", () => {
      const mockEvent = {
        button: 0,
      } as MouseEvent;

      expect(isRightClick(mockEvent)).toBe(false);
    });

    it("should return false for middle click (button === 1)", () => {
      const mockEvent = {
        button: 1,
      } as MouseEvent;

      expect(isRightClick(mockEvent)).toBe(false);
    });

    it("should return false for other button values", () => {
      const mockEvent = {
        button: 3,
      } as MouseEvent;

      expect(isRightClick(mockEvent)).toBe(false);
    });
  });

  describe("isLeftClick", () => {
    it("should return true for left click (button === 0)", () => {
      const mockEvent = {
        button: 0,
      } as MouseEvent;

      expect(isLeftClick(mockEvent)).toBe(true);
    });

    it("should return false for right click (button === 2)", () => {
      const mockEvent = {
        button: 2,
      } as MouseEvent;

      expect(isLeftClick(mockEvent)).toBe(false);
    });

    it("should return false for middle click (button === 1)", () => {
      const mockEvent = {
        button: 1,
      } as MouseEvent;

      expect(isLeftClick(mockEvent)).toBe(false);
    });

    it("should return false for other button values", () => {
      const mockEvent = {
        button: 4,
      } as MouseEvent;

      expect(isLeftClick(mockEvent)).toBe(false);
    });
  });
});
