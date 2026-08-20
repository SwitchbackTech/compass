import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  getEffectiveTimeZone,
  getPinnedTimeZone,
  resetEffectiveTimeZoneStoreForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { TimezonePickerDialog } from "@web/timezone/TimezonePickerDialog";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("TimezonePickerDialog", () => {
  afterEach(() => {
    act(() => {
      resetEffectiveTimeZoneStoreForTests();
    });
  });

  it("lists Auto first and pins a searched city", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePickerDialog onDismiss={() => timezoneDialogActions.close()} />,
    );

    expect(
      screen.getByRole("option", { name: /Use browser timezone \(Auto\)/ }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("combobox", { name: "Search timezones" }),
      "Chi",
    );

    await user.click(screen.getByRole("option", { name: /Chicago/ }));
    expect(getPinnedTimeZone()).toBe("America/Chicago");
  });

  it("does not mount the full IANA catalog on first paint", () => {
    render(
      <TimezonePickerDialog onDismiss={() => timezoneDialogActions.close()} />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAccessibleName(/Use browser timezone \(Auto\)/);
    expect(options.length).toBeGreaterThan(1);
    expect(options.length).toBeLessThan(80);
  });

  it("pins the highlighted search result on Enter", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePickerDialog onDismiss={() => timezoneDialogActions.close()} />,
    );

    const search = screen.getByRole("combobox", { name: "Search timezones" });
    await user.type(search, "Chicago");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(getPinnedTimeZone()).toBe("America/Chicago");
  });

  it("returns to Auto from the first row", async () => {
    const user = userEvent.setup();
    act(() => {
      setPinnedTimeZone("America/New_York");
    });

    render(
      <TimezonePickerDialog onDismiss={() => timezoneDialogActions.close()} />,
    );

    await user.click(
      screen.getByRole("option", { name: /Use browser timezone \(Auto\)/ }),
    );

    expect(getPinnedTimeZone()).toBeNull();
    expect(getEffectiveTimeZone()).toBe(getBrowserTimeZone());
  });
});
