import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { RecurringEventUpdateScope } from "@core/types/event.types";

// CSS.escape is not implemented in the jsdom version used by this project's
// test environment, but @testing-library/user-event needs it to walk radio
// groups by name.
beforeAll(() => {
  if (typeof window !== "undefined" && !window.CSS?.escape) {
    const css = window.CSS ?? {};
    css.escape = (value: string) =>
      String(value).replace(/[^\w-]/g, (ch) => `\\${ch}`);
    if (!window.CSS) {
      Object.defineProperty(window, "CSS", {
        value: css,
        configurable: true,
        writable: true,
      });
    }
  }
});

mock.module("@web/store/store.hooks", () => ({
  useAppSelector: mock(() => null),
  useAppDispatch: mock(() => mock()),
}));

const { RecurringEventUpdateScopeDialogContent } =
  require("./RecurringEventUpdateScopeDialog") as typeof import("./RecurringEventUpdateScopeDialog");

function setup() {
  const user = userEvent.setup();
  const onUpdateScopeChange = mock();
  const setRecurrenceUpdateScopeDialogOpen = mock();

  render(
    <RecurringEventUpdateScopeDialogContent
      draft={null}
      onUpdateScopeChange={onUpdateScopeChange}
      setRecurrenceUpdateScopeDialogOpen={setRecurrenceUpdateScopeDialogOpen}
    />,
  );

  return { user, onUpdateScopeChange, setRecurrenceUpdateScopeDialogOpen };
}

describe("RecurringEventUpdateScopeDialogContent", () => {
  describe("rendering", () => {
    it("renders dialog with title", () => {
      setup();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Apply changes to" }),
      ).toBeInTheDocument();
    });

    it("renders all three scope options", () => {
      setup();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_EVENT,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.ALL_EVENTS,
        }),
      ).toBeInTheDocument();
    });

    it("selects This Event by default", () => {
      setup();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_EVENT,
        }),
      ).toBeChecked();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        }),
      ).not.toBeChecked();
      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.ALL_EVENTS,
        }),
      ).not.toBeChecked();
    });

    it("renders Cancel and Ok buttons", () => {
      setup();
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ok" })).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("radio inputs are focusable", () => {
      setup();
      const thisEvent = screen.getByRole("radio", {
        name: RecurringEventUpdateScope.THIS_EVENT,
      });
      thisEvent.focus();
      expect(thisEvent).toHaveFocus();
    });

    it("ArrowDown moves selection to the next option", async () => {
      const { user } = setup();
      screen
        .getByRole("radio", { name: RecurringEventUpdateScope.THIS_EVENT })
        .focus();

      await user.keyboard("[ArrowDown]");

      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        }),
      ).toBeChecked();
    });

    it("ArrowUp moves selection to the previous option", async () => {
      const { user } = setup();
      screen
        .getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        })
        .focus();

      await user.keyboard("[ArrowUp]");

      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_EVENT,
        }),
      ).toBeChecked();
    });

    it("Space selects the focused radio option", async () => {
      const { user } = setup();
      screen
        .getByRole("radio", { name: RecurringEventUpdateScope.ALL_EVENTS })
        .focus();

      await user.keyboard(" ");

      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.ALL_EVENTS,
        }),
      ).toBeChecked();
    });

    it("Enter on the radiogroup submits with the selected scope", async () => {
      const { user, onUpdateScopeChange } = setup();
      screen
        .getByRole("radio", { name: RecurringEventUpdateScope.THIS_EVENT })
        .focus();

      await user.keyboard("[Enter]");

      expect(onUpdateScopeChange).toHaveBeenCalledTimes(1);
      expect(onUpdateScopeChange).toHaveBeenCalledWith(
        RecurringEventUpdateScope.THIS_EVENT,
      );
    });

    it("Escape closes the dialog", async () => {
      const { user, setRecurrenceUpdateScopeDialogOpen } = setup();

      await user.keyboard("[Escape]");

      expect(setRecurrenceUpdateScopeDialogOpen).toHaveBeenCalledWith(false);
    });

    it("Tab moves focus from radio group to Cancel button", async () => {
      const { user } = setup();
      screen
        .getByRole("radio", { name: RecurringEventUpdateScope.THIS_EVENT })
        .focus();

      await user.tab();

      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("Tab moves focus from Cancel to Ok", async () => {
      const { user } = setup();
      screen.getByRole("button", { name: "Cancel" }).focus();

      await user.tab();

      expect(screen.getByRole("button", { name: "Ok" })).toHaveFocus();
    });
  });

  describe("mouse interaction", () => {
    it("clicking a radio option selects it", async () => {
      const { user } = setup();

      await user.click(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        }),
      );

      expect(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
        }),
      ).toBeChecked();
    });

    it("Cancel button closes the dialog", async () => {
      const { user, setRecurrenceUpdateScopeDialogOpen } = setup();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(setRecurrenceUpdateScopeDialogOpen).toHaveBeenCalledWith(false);
      expect(setRecurrenceUpdateScopeDialogOpen).toHaveBeenCalledTimes(1);
    });

    it("Ok button calls onUpdateScopeChange with the selected scope", async () => {
      const { user, onUpdateScopeChange } = setup();

      await user.click(
        screen.getByRole("radio", {
          name: RecurringEventUpdateScope.ALL_EVENTS,
        }),
      );
      await user.click(screen.getByRole("button", { name: "Ok" }));

      expect(onUpdateScopeChange).toHaveBeenCalledWith(
        RecurringEventUpdateScope.ALL_EVENTS,
      );
    });

    it("Ok button uses the default scope when no option is explicitly selected", async () => {
      const { user, onUpdateScopeChange } = setup();

      await user.click(screen.getByRole("button", { name: "Ok" }));

      expect(onUpdateScopeChange).toHaveBeenCalledWith(
        RecurringEventUpdateScope.THIS_EVENT,
      );
    });
  });
});
