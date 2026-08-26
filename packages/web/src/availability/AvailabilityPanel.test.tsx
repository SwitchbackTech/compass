import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTimeTravelZone } from "@web/timezone/time-travel.store";
import { useTimezoneDialogStore } from "@web/timezone/timezone-dialog.store";
import { AvailabilityGridOverlay } from "./AvailabilityGridOverlay";
import { AvailabilityPanel } from "./AvailabilityPanel";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";
import { describe, expect, it, mock } from "bun:test";

const slot = (hour: number, selected = false) => {
  const start = `2099-08-27T${String(hour).padStart(2, "0")}:00:00.000Z`;
  const end = `2099-08-27T${String(hour).padStart(2, "0")}:30:00.000Z`;
  return {
    id: `${start}/${end}`,
    start,
    end,
    selected,
    origin: "suggested" as const,
  };
};

describe("AvailabilityPanel", () => {
  it("disables empty copy and shows loading, error, and live announcements", () => {
    availabilityActions.open();
    availabilityActions.setStatus("loading");
    const view = render(<AvailabilityPanel />);
    expect(
      screen.getByRole("button", { name: "Copy availability to clipboard" }),
    ).toBeDisabled();
    expect(screen.getByText("Checking your calendars…")).toBeInTheDocument();

    act(() => {
      availabilityActions.setStatus("error");
      availabilityActions.announce(
        "A selected time was removed because it is no longer free.",
      );
    });
    view.rerender(<AvailabilityPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Availability couldn’t be checked",
    );
    expect(
      screen.getByText(
        "A selected time was removed because it is no longer free.",
      ),
    ).toBeInTheDocument();
  });

  it("copies the exact preview", async () => {
    const user = userEvent.setup();
    const writeText = mock().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    availabilityActions.open([slot(10, true)]);
    availabilityActions.setStatus("ready");
    render(<AvailabilityPanel />);
    const preview = screen.getByRole("region", {
      name: "Availability message preview",
    });
    await user.click(
      screen.getByRole("button", { name: "Copy availability to clipboard" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(preview.textContent),
    );
  });

  it("focuses the preview when clipboard access is rejected", async () => {
    const user = userEvent.setup();
    const writeText = mock(() => Promise.reject(new Error("denied")));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    availabilityActions.open([slot(10, true)]);
    availabilityActions.setStatus("ready");
    render(<AvailabilityPanel />);
    await user.click(
      screen.getByRole("button", { name: "Copy availability to clipboard" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Availability message preview" }),
      ).toHaveFocus(),
    );
  });

  it("commits recipient selection without mutating time travel", async () => {
    const user = userEvent.setup();
    availabilityActions.open([slot(10, true)]);
    availabilityActions.setStatus("ready");
    render(<AvailabilityPanel />);
    await user.click(
      screen.getByRole("button", { name: /Add recipient timezone/ }),
    );
    expect(useTimezoneDialogStore.getState().purpose).toBe(
      "availability-recipient",
    );
    act(() => useTimezoneDialogStore.getState().onSelect?.("Europe/London"));
    expect(useAvailabilityStore.getState().recipientZone).toBe("Europe/London");
    expect(getTimeTravelZone()).toBeNull();
  });
});

describe("AvailabilityGridOverlay", () => {
  it("toggles a cell and pointer-drags across adjacent free cells", () => {
    availabilityActions.open([slot(9), slot(10), slot(11)]);
    availabilityActions.setStatus("ready");
    render(
      <AvailabilityGridOverlay hourHeight={40} visibleDates={["2099-08-27"]} />,
    );
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]!);
    expect(useAvailabilityStore.getState().slots[0]?.selected).toBe(true);
    fireEvent.pointerDown(options[1]!, { pointerId: 1 });
    fireEvent.pointerEnter(options[2]!, { pointerId: 1 });
    fireEvent.pointerUp(options[2]!, { pointerId: 1 });
    expect(
      useAvailabilityStore.getState().slots.map(({ selected }) => selected),
    ).toEqual([true, true, true]);
  });
});
