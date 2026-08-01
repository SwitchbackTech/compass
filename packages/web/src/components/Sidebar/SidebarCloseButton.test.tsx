import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { SidebarCloseButton } from "./SidebarCloseButton";
import { SidebarToggleButton } from "./SidebarToggleButton";
import { beforeEach, describe, expect, it } from "bun:test";

function Harness() {
  const isOpen = useViewStore(selectIsSidebarOpen);
  return (
    <div>
      <SidebarToggleButton />
      {isOpen ? <SidebarCloseButton /> : null}
    </div>
  );
}

describe("SidebarCloseButton", () => {
  beforeEach(() => {
    viewActions.setSidebarOpen(true);
  });

  it("closes the sidebar and focuses the header open control", async () => {
    const user = userEvent.setup();
    const { wrapper } = createStoreWrapper();

    render(<Harness />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Dismiss sidebar" }));

    expect(
      screen.queryByRole("button", { name: "Dismiss sidebar" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open sidebar" }),
      ).toHaveFocus();
    });
  });
});
