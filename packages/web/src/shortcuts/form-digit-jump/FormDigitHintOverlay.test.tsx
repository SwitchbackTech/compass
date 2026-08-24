import { cleanup, render, screen } from "@testing-library/react";
import { FormDigitHintOverlay } from "@web/shortcuts/form-digit-jump/FormDigitHintOverlay";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const box = (
  top: number,
  left: number,
  bottom: number,
  right: number,
): DOMRect =>
  ({
    top,
    left,
    bottom,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const stubRect = (element: HTMLElement, rect: DOMRect) => {
  element.getBoundingClientRect = () => rect;
};

const overlayRoot = () => document.querySelector("[data-form-digit-hints]");
const chipsWrapper = () => overlayRoot()?.querySelector("[aria-hidden]");
const chipDigits = () =>
  Array.from(chipsWrapper()?.children ?? []).map((el) => el.textContent);

/**
 * Builds a minimal event-form DOM matching the real selectors
 * (`common/utils/form/form.util.ts`'s FIELD_SELECTORS) for every field except
 * calendar, which callers add separately to test its conditional absence.
 */
const buildForm = () => {
  const form = document.createElement("form");
  form.setAttribute("name", "Event Form");
  document.body.append(form);

  const title = document.createElement("input");
  title.setAttribute("name", "Event Title");
  form.append(title);

  const start = document.createElement("input");
  start.id = "startTimePicker";
  form.append(start);

  const end = document.createElement("input");
  end.id = "endTimePicker";
  form.append(end);

  const recurrence = document.createElement("div");
  recurrence.id = "event-form-recurrence";
  const recurrenceButton = document.createElement("button");
  recurrenceButton.setAttribute("aria-label", "Edit recurrence");
  recurrence.append(recurrenceButton);
  form.append(recurrence);

  const color = document.createElement("div");
  color.id = "event-form-color";
  const radio = document.createElement("input");
  radio.type = "radio";
  color.append(radio);
  document.body.append(color);

  const location = document.createElement("div");
  location.id = "event-form-location";
  form.append(location);

  const description = document.createElement("div");
  description.id = "event-form-description";
  document.body.append(description);

  const elements = [
    title,
    start,
    end,
    recurrenceButton,
    radio,
    location,
    description,
  ];
  for (const element of elements) {
    stubRect(element, box(100, 80, 140, 240));
  }

  return { form };
};

describe("FormDigitHintOverlay", () => {
  let originalInnerHeight: number;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerHeight = window.innerHeight;
    originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("renders nothing when not visible", () => {
    buildForm();
    render(<FormDigitHintOverlay visible={false} />);

    expect(overlayRoot()).toBeNull();
  });

  it("renders a chip for every present field except the missing calendar picker", () => {
    buildForm();
    render(<FormDigitHintOverlay visible={true} />);

    // Digit 5 (calendar) has no chip: no #event-form-calendar element was added,
    // matching an edit draft where the calendar picker isn't rendered.
    expect(chipDigits()).toEqual(["1", "2", "3", "4", "6", "7", "8"]);
  });

  it("renders the calendar chip once the picker is present", () => {
    buildForm();
    const calendar = document.createElement("div");
    calendar.id = "event-form-calendar";
    stubRect(calendar, box(100, 80, 140, 240));
    document.body.append(calendar);

    render(<FormDigitHintOverlay visible={true} />);

    expect(chipDigits()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("exposes a screen-reader summary while the visible chips stay aria-hidden", () => {
    buildForm();
    render(<FormDigitHintOverlay visible={true} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Jump to field?");
    expect(status.textContent).toContain("1 for title");
    expect(status.textContent).toContain("8 for description");
    expect(chipsWrapper()?.getAttribute("aria-hidden")).not.toBeNull();
  });

  it("does not announce a field with no chip, so the screen-reader summary never advertises a dead shortcut", () => {
    buildForm();
    render(<FormDigitHintOverlay visible={true} />);

    // No #event-form-calendar element was added (edit-draft state), so digit
    // 5 has neither a chip nor an announcement.
    expect(screen.getByRole("status").textContent).not.toContain("calendar");
  });
});
