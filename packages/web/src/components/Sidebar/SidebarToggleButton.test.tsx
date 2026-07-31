import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { viewActions } from "@web/events/stores/view.store";
import { SidebarToggleButton } from "./SidebarToggleButton";
import { beforeEach, describe, expect, it } from "bun:test";

describe("SidebarToggleButton", () => {
  beforeEach(() => {
    viewActions.setSidebarOpen(false);
  });

  it("opens the sidebar when labeled open", async () => {
    const user = userEvent.setup();
    const { wrapper } = createStoreWrapper();

    render(<SidebarToggleButton />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Open sidebar" }));

    expect(
      screen.getByRole("button", { name: "Close sidebar" }),
    ).toBeInTheDocument();
  });

  it("closes the sidebar when labeled close", async () => {
    const user = userEvent.setup();
    const { wrapper } = createStoreWrapper();
    viewActions.setSidebarOpen(true);

    render(<SidebarToggleButton />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Close sidebar" }));

    expect(
      screen.getByRole("button", { name: "Open sidebar" }),
    ).toBeInTheDocument();
  });
});
