import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import {
  EditSequenceMenu,
  resolveMenuPosition,
} from "@web/shortcuts/edit-sequence/EditSequenceMenu";
import { editSequenceActions } from "@web/shortcuts/edit-sequence/edit-sequence.store";
import { afterEach, describe, expect, it } from "bun:test";

const MENU_WIDTH = 232;
/** Passed explicitly so these assertions do not depend on the estimate. */
const MENU_HEIGHT = 200;

const anchorWithRect = (rect: Partial<DOMRect>): HTMLElement => {
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      ...rect,
    }) as DOMRect;
  return element;
};

describe("EditSequenceMenu", () => {
  afterEach(() => {
    // No manual DOM reset here: the menu renders through a portal, and
    // clearing document.body out from under React breaks its unmount.
    editSequenceActions.disarm();
  });

  it("renders nothing until the menu is visible", () => {
    render(<EditSequenceMenu getAnchor={() => null} />);

    expect(document.querySelector("[data-edit-sequence-menu]")).toBeNull();
  });

  it("announces every option to screen readers", () => {
    editSequenceActions.arm();
    editSequenceActions.showMenu();
    render(<EditSequenceMenu getAnchor={() => null} />);

    expect(
      screen.getByRole("status", { hidden: true }).textContent,
    ).toStrictEqual(
      "Edit which field? T for title, L for location, D for description, " +
        "S for start, E for end, R for repeat, C for calendar. Escape to cancel." +
        "Edit which field?TTitleLLocationDDescriptionSStartEEndRRepeatCCalendar" +
        "Esc to cancel",
    );
  });

  it("lists each second key with its field", () => {
    editSequenceActions.arm();
    editSequenceActions.showMenu();
    render(<EditSequenceMenu getAnchor={() => null} />);

    const menu = document.querySelector("[data-edit-sequence-menu]");
    expect(menu).not.toBeNull();
    for (const label of [
      "Title",
      "Location",
      "Description",
      "Start",
      "End",
      "Repeat",
      "Calendar",
    ]) {
      expect(menu?.textContent).toContain(label);
    }
  });

  describe("resolveMenuPosition", () => {
    it("sits below the anchor when there is room", () => {
      const anchor = anchorWithRect({
        top: 100,
        bottom: 140,
        left: 200,
        right: 340,
        width: 140,
        height: 40,
      });

      expect(resolveMenuPosition(anchor, MENU_HEIGHT)).toStrictEqual({
        top: 148,
        left: 200,
      });
    });

    it("flips above the anchor when it would run off the bottom", () => {
      const anchor = anchorWithRect({
        top: window.innerHeight - 60,
        bottom: window.innerHeight - 20,
        left: 200,
        right: 340,
        width: 140,
        height: 40,
      });

      expect(resolveMenuPosition(anchor, MENU_HEIGHT)).toStrictEqual({
        top: window.innerHeight - 60 - MENU_HEIGHT - 8,
        left: 200,
      });
    });

    it("clears the anchor with a taller-than-estimated menu", () => {
      // Regression: a hardcoded height let a flipped menu cover the very event
      // it points at once the rendered box grew past the estimate.
      const anchorTop = window.innerHeight - 60;
      const anchor = anchorWithRect({
        top: anchorTop,
        bottom: window.innerHeight - 20,
        left: 200,
        right: 340,
        width: 140,
        height: 40,
      });

      const tall = 320;
      const { top } = resolveMenuPosition(anchor, tall);

      expect(top + tall).toBeLessThanOrEqual(anchorTop);
    });

    it("clamps to the viewport when the anchor hugs the right edge", () => {
      const anchor = anchorWithRect({
        top: 100,
        bottom: 140,
        left: window.innerWidth - 20,
        right: window.innerWidth - 4,
        width: 16,
        height: 40,
      });

      expect(resolveMenuPosition(anchor, MENU_HEIGHT).left).toStrictEqual(
        window.innerWidth - MENU_WIDTH - 8,
      );
    });

    it("falls back to the viewport when there is no anchor", () => {
      expect(resolveMenuPosition(null, MENU_HEIGHT)).toStrictEqual({
        top: window.innerHeight - MENU_HEIGHT - 32,
        left: (window.innerWidth - MENU_WIDTH) / 2,
      });
    });

    it("falls back when the anchor has scrolled out of sight", () => {
      const offscreen = anchorWithRect({
        top: -200,
        bottom: -160,
        left: 200,
        right: 340,
        width: 140,
        height: 40,
      });

      expect(resolveMenuPosition(offscreen, MENU_HEIGHT)).toStrictEqual(
        resolveMenuPosition(null, MENU_HEIGHT),
      );
    });
  });
});
