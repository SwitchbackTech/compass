import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import {
  type CalendarId,
  CalendarIdSchema,
} from "@core/types/domain-primitives";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { CalendarSelect } from "@web/views/Forms/EventForm/CalendarSelect/CalendarSelect";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

const renderCalendarSelect = (
  calendars: Calendar[],
  {
    value = null,
    onChange = mock(),
  }: {
    value?: CalendarId | null;
    onChange?: (id: CalendarId) => void;
  } = {},
) => {
  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  const utils = render(<CalendarSelect onChange={onChange} value={value} />, {
    wrapper,
  });

  return { queryClient, onChange, ...utils };
};

async function openDropdown() {
  const user = userEvent.setup();
  const button = screen.getByRole("combobox", { name: /calendar/i });
  await user.click(button);

  await waitFor(() => {
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  return { button, user };
}

describe("CalendarSelect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("lists only writable, active calendars and marks the primary one", async () => {
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const writable = makeCalendar({ name: "Team" });
    const readOnly = makeCalendar({
      name: "Holidays",
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });
    const inactive = makeCalendar({ name: "Archived", isActive: false });

    renderCalendarSelect([primary, writable, readOnly, inactive]);

    await openDropdown();

    const listbox = screen.getByRole("listbox");
    const optionNames = within(listbox)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(optionNames).toEqual(["Personal (primary)", "Team"]);
    expect(within(listbox).queryByText("Holidays")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Archived")).not.toBeInTheDocument();
  });

  it("defaults the displayed/selected calendar to the default target when no value is chosen yet", async () => {
    const primaryGoogle = makeCalendar({ name: "Personal", isPrimary: true });
    const other = makeCalendar({ name: "Team" });

    renderCalendarSelect([primaryGoogle, other], { value: null });

    expect(
      screen.getByRole("combobox", {
        name: /Calendar:.*Personal \(primary\)/,
      }),
    ).toBeInTheDocument();

    await openDropdown();
    const defaultOption = screen.getByRole("option", {
      name: "Personal (primary)",
    });
    expect(defaultOption).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange with the selected calendar's id and closes the dropdown", async () => {
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const team = makeCalendar({ name: "Team" });
    const onChange = mock();

    renderCalendarSelect([primary, team], { onChange });

    const { user } = await openDropdown();
    await user.click(screen.getByRole("option", { name: "Team" }));

    expect(onChange).toHaveBeenCalledWith(team.id);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows a no-writable-calendar message and no combobox when every calendar is read-only", () => {
    const readOnly = makeCalendar({
      name: "Holidays",
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });

    renderCalendarSelect([readOnly]);

    expect(
      screen.getByText("No writable calendar available"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens with Enter, navigates options with the arrow keys, and closes with Escape", async () => {
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const team = makeCalendar({ name: "Team" });

    renderCalendarSelect([primary, team]);

    const button = screen.getByRole("combobox", { name: /calendar/i });
    const user = userEvent.setup();
    button.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    const primaryOption = screen.getByRole("option", {
      name: "Personal (primary)",
    });
    primaryOption.focus();

    await user.keyboard("{ArrowDown}");

    await waitFor(() => {
      const teamOption = screen.getByRole("option", { name: "Team" });
      expect(teamOption).toHaveAttribute("tabindex", "0");
      expect(primaryOption).toHaveAttribute("tabindex", "-1");
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
