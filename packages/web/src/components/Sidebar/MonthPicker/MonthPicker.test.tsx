import {
  HotkeyManager,
  HotkeysProvider,
  resolveModifier,
} from "@tanstack/react-hotkeys";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, type PropsWithChildren, type ReactElement } from "react";
import dayjs from "@core/util/date/dayjs";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { MonthPicker } from "@web/components/Sidebar/MonthPicker/MonthPicker";
import {
  pageJumpHintActions,
  usePageJumpHintStore,
} from "@web/shortcuts/page-jump/page-jump.store";
import { MONTH_PICKER_IN_VIEW_CLASS } from "./monthPickerDayClassName";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const getSelectedDay = () =>
  document.querySelector(".react-datepicker__day--selected");

const dayNamed = (label: string) => screen.getByLabelText(label);

const wrapper = ({ children }: PropsWithChildren) => (
  <HotkeysProvider>{children}</HotkeysProvider>
);

const renderPicker = (ui: ReactElement) => render(ui, { wrapper });

const isMac = resolveModifier("Mod") === "Meta";
const pressMonthChord = (key: string) => {
  const init = isMac
    ? { metaKey: true, shiftKey: true }
    : { ctrlKey: true, shiftKey: true };
  pressKey(key, { keyDownInit: init, keyUpInit: init });
};

const pickerProps = {
  selectedDate: dayjs("2026-05-18"),
  viewEnd: dayjs("2026-05-23"),
  viewStart: dayjs("2026-05-17"),
} as const;

beforeEach(() => {
  HotkeyManager.resetInstance();
});

afterEach(() => {
  cleanup();
  pageJumpHintActions.reset();
});

describe("MonthPicker", () => {
  it("keeps the clicked date selected while navigation catches up", async () => {
    const user = userEvent.setup({ skipHover: true });
    const onSelectDate = mock();

    renderPicker(
      <MonthPicker
        onSelectDate={onSelectDate}
        selectedDate={dayjs("2026-05-18")}
        viewEnd={dayjs("2026-05-23")}
        viewStart={dayjs("2026-05-17")}
      />,
    );

    await user.click(screen.getByLabelText("Choose Monday, May 25th, 2026"));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(getSelectedDay()?.getAttribute("aria-label")).toBe(
      "Choose Monday, May 25th, 2026",
    );
  });

  it("highlights the visible Sun-Sat window, not adjacent days", () => {
    renderPicker(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-16")}
        viewStart={dayjs("2026-05-10")}
      />,
    );

    expect(dayNamed("Choose Sunday, May 10th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Saturday, May 16th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Saturday, May 9th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 17th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
  });

  it("moves the in-view band when the visible window shifts while selection stays", () => {
    const { rerender } = renderPicker(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-16")}
        viewStart={dayjs("2026-05-10")}
      />,
    );

    expect(dayNamed("Choose Wednesday, May 13th, 2026")).toHaveClass(
      "react-datepicker__day--selected",
    );

    rerender(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-17")}
        viewStart={dayjs("2026-05-11")}
      />,
    );

    expect(dayNamed("Choose Saturday, May 9th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 10th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Monday, May 11th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 17th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Wednesday, May 13th, 2026")).toHaveClass(
      "react-datepicker__day--selected",
    );
  });

  it("starts weekday columns on Monday when the week view starts Monday", () => {
    renderPicker(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-17")}
        viewStart={dayjs("2026-05-11")}
      />,
    );

    const weekdayHeaders = screen
      .getByRole("group", { name: "Date navigation" })
      .querySelectorAll(".react-datepicker__day-name");
    expect([...weekdayHeaders].map((header) => header.textContent)).toEqual([
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
      "S",
    ]);

    const monday = dayNamed("Choose Monday, May 11th, 2026");
    const sunday = dayNamed("Choose Sunday, May 17th, 2026");
    const previousSunday = dayNamed("Choose Sunday, May 10th, 2026");

    expect(monday.closest(".react-datepicker__week")).toBe(
      sunday.closest(".react-datepicker__week"),
    );
    expect(previousSunday.closest(".react-datepicker__week")).not.toBe(
      monday.closest(".react-datepicker__week"),
    );
  });

  it("keeps Sunday-first columns for a single-day Day view window", () => {
    renderPicker(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-13")}
        viewStart={dayjs("2026-05-13")}
      />,
    );

    const firstHeader = screen
      .getByRole("group", { name: "Date navigation" })
      .querySelector(".react-datepicker__day-name");
    expect(firstHeader?.textContent).toBe("S");
  });

  it("lets the chevrons change the displayed month", async () => {
    const user = userEvent.setup({ skipHover: true });
    const onSelectDate = mock();
    renderPicker(<MonthPicker onSelectDate={onSelectDate} {...pickerProps} />);

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByText("Apr 2026")).toBeInTheDocument();
    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it("steps the displayed month back and forward without selecting a date", async () => {
    const onSelectDate = mock();
    renderPicker(<MonthPicker onSelectDate={onSelectDate} {...pickerProps} />);

    expect(screen.getByText("May 2026")).toBeInTheDocument();

    act(() => {
      pressMonthChord("J");
    });

    await waitFor(() => {
      expect(screen.getByText("Apr 2026")).toBeInTheDocument();
    });
    expect(screen.queryByText("May 2026")).not.toBeInTheDocument();
    expect(onSelectDate).not.toHaveBeenCalled();

    act(() => {
      pressMonthChord("K");
    });

    await waitFor(() => {
      expect(screen.getByText("May 2026")).toBeInTheDocument();
    });
    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it("reveals Shift+J and Shift+K chips on the chevrons while Mod-hold hints are visible", () => {
    usePageJumpHintStore.setState({ areHintsVisible: true });
    renderPicker(<MonthPicker onSelectDate={mock()} {...pickerProps} />);

    const prev = screen.getByRole("button", { name: "Previous month" });
    const next = screen.getByRole("button", { name: "Next month" });

    expect(prev.parentElement?.textContent).toContain("Shift");
    expect(prev.parentElement?.textContent).toContain("J");
    expect(next.parentElement?.textContent).toContain("Shift");
    expect(next.parentElement?.textContent).toContain("K");
  });

  it("hides month-nav hold chips when Mod-hold hints are off", () => {
    renderPicker(<MonthPicker onSelectDate={mock()} {...pickerProps} />);

    const prev = screen.getByRole("button", { name: "Previous month" });
    expect(prev.parentElement?.textContent).not.toContain("Shift");
  });
});
