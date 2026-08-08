import { ID_EVENT_FORM } from "../../constants/web.constants";
import {
  isComboboxInteraction,
  isEditableKeyboardTarget,
  isEventFormKeyboardTarget,
  shouldDeferEnterToTarget,
} from "./form.util";
import { describe, expect, it } from "bun:test";

describe("form.util", () => {
  describe("isComboboxInteraction", () => {
    const createEvent = (element: HTMLElement | null) =>
      ({ target: element }) as unknown as KeyboardEvent;

    it("returns true when role is combobox", () => {
      const element = document.createElement("div");
      element.setAttribute("role", "combobox");

      expect(isComboboxInteraction(createEvent(element))).toBe(true);
    });

    it("returns true when inside freq-select control", () => {
      const wrapper = document.createElement("div");
      wrapper.className = "freq-select__control";
      const child = document.createElement("span");
      wrapper.appendChild(child);

      expect(isComboboxInteraction(createEvent(child))).toBe(true);
    });

    it("returns false when no combobox context is present", () => {
      const element = document.createElement("div");

      expect(isComboboxInteraction(createEvent(element))).toBe(false);
    });

    it("returns false when target is null", () => {
      expect(isComboboxInteraction(createEvent(null))).toBe(false);
    });
  });

  describe("isEditableKeyboardTarget", () => {
    const createEvent = (element: HTMLElement | null) =>
      ({ target: element }) as unknown as KeyboardEvent;

    it("treats inputs as editable", () => {
      const input = document.createElement("input");

      expect(isEditableKeyboardTarget(createEvent(input))).toBe(true);
    });

    it("treats textareas as editable", () => {
      const textarea = document.createElement("textarea");

      expect(isEditableKeyboardTarget(createEvent(textarea))).toBe(true);
    });

    it("treats selects as editable", () => {
      const select = document.createElement("select");

      expect(isEditableKeyboardTarget(createEvent(select))).toBe(true);
    });
  });

  describe("shouldDeferEnterToTarget", () => {
    const createEvent = (element: HTMLElement | null) =>
      ({ target: element }) as unknown as KeyboardEvent;

    it("defers Enter for contenteditable targets", () => {
      const editable = document.createElement("div");
      // Set the attribute explicitly: jsdom often leaves isContentEditable
      // undefined even after assigning the contentEditable property.
      editable.setAttribute("contenteditable", "true");

      expect(shouldDeferEnterToTarget(createEvent(editable))).toBe(true);
    });

    it("defers Enter for descendants of a contenteditable host", () => {
      const editable = document.createElement("div");
      editable.setAttribute("contenteditable", "true");
      const paragraph = document.createElement("p");
      editable.appendChild(paragraph);

      expect(shouldDeferEnterToTarget(createEvent(paragraph))).toBe(true);
    });

    it("defers Enter for textareas", () => {
      const textarea = document.createElement("textarea");

      expect(shouldDeferEnterToTarget(createEvent(textarea))).toBe(true);
    });

    it("defers Enter for buttons", () => {
      const button = document.createElement("button");

      expect(shouldDeferEnterToTarget(createEvent(button))).toBe(true);
    });

    it("defers Enter for role=button and links", () => {
      const roleButton = document.createElement("div");
      roleButton.setAttribute("role", "button");
      const link = document.createElement("a");
      link.setAttribute("href", "https://example.com");

      expect(shouldDeferEnterToTarget(createEvent(roleButton))).toBe(true);
      expect(shouldDeferEnterToTarget(createEvent(link))).toBe(true);
    });

    it("does not defer Enter for single-line inputs", () => {
      const input = document.createElement("input");

      expect(shouldDeferEnterToTarget(createEvent(input))).toBe(false);
    });
  });

  describe("isEventFormKeyboardTarget", () => {
    const createEvent = (element: HTMLElement | null) =>
      ({ target: element }) as unknown as KeyboardEvent;

    it("returns true when the target is inside the event form", () => {
      const form = document.createElement("form");
      form.setAttribute("name", ID_EVENT_FORM);
      const button = document.createElement("button");
      form.appendChild(button);
      document.body.appendChild(form);

      expect(isEventFormKeyboardTarget(createEvent(button))).toBe(true);
    });

    it("returns false when the target is outside event forms", () => {
      const button = document.createElement("button");
      document.body.appendChild(button);

      expect(isEventFormKeyboardTarget(createEvent(button))).toBe(false);
    });
  });
});
