import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { setEffectiveTimeZoneForTests } from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { GridTimezoneLabel } from "@web/timezone/GridTimezoneLabel";
import { describe, expect, it } from "bun:test";

describe("GridTimezoneLabel", () => {
  it("is a focusable button named with the effective zone abbreviation", async () => {
    const user = userEvent.setup();
    act(() => {
      setEffectiveTimeZoneForTests("America/Denver");
    });

    render(
      <div>
        <button type="button">Before</button>
        <GridTimezoneLabel />
      </div>,
    );

    const abbreviation = formatTimeZoneAbbreviation("America/Denver");
    const label = screen.getByRole("button", {
      name: `Calendar timezone: ${abbreviation}`,
    });
    expect(label).toHaveTextContent(abbreviation);

    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(label).toHaveFocus();
  });

  it("updates the label when the effective timezone changes", () => {
    act(() => {
      setEffectiveTimeZoneForTests("UTC");
    });

    const { rerender } = render(<GridTimezoneLabel />);
    expect(
      screen.getByRole("button", { name: "Calendar timezone: UTC" }),
    ).toBeInTheDocument();

    act(() => {
      setEffectiveTimeZoneForTests("Asia/Kolkata");
    });
    rerender(<GridTimezoneLabel />);

    expect(
      screen.getByRole("button", { name: "Calendar timezone: GMT+5:30" }),
    ).toHaveTextContent("GMT+5:30");
  });
});
