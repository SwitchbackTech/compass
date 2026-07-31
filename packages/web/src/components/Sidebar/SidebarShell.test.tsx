import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT } from "@web/components/AuthenticatedLayout/responsive.constants";
import { viewActions } from "@web/events/stores/view.store";
import { SidebarShell } from "./SidebarShell";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const originalMatchMedia = window.matchMedia;

function mockViewport(isNarrow: boolean) {
  window.matchMedia = mock((query: string) => {
    const matchesMinWidth = query.includes(
      `min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px`,
    )
      ? !isNarrow
      : false;
    return {
      matches: matchesMinWidth,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

function renderShell() {
  const { wrapper } = createStoreWrapper();
  return render(
    <SidebarShell
      isShortcutsOpen={false}
      onCloseShortcuts={mock()}
      onToggleShortcuts={mock()}
      shortcutSections={[]}
      SidebarActionsComponent={() => null}
      ShortcutsOverlayComponent={() => null}
    >
      <div>Sidebar body</div>
    </SidebarShell>,
    { wrapper },
  );
}

beforeEach(() => {
  viewActions.setSidebarOpen(true);
  mockViewport(false);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("SidebarShell", () => {
  it("keeps the close control out of the sidebar on wide layouts", () => {
    mockViewport(false);
    renderShell();

    expect(
      screen.queryByRole("button", { name: "Close sidebar" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Sidebar body")).toBeInTheDocument();
  });

  it("shows a close control inside the sidebar on narrow layouts", async () => {
    const user = userEvent.setup();
    mockViewport(true);
    renderShell();

    const closeButton = screen.getByRole("button", { name: "Close sidebar" });
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton);

    expect(
      screen.getByRole("button", { name: "Open sidebar" }),
    ).toBeInTheDocument();
  });
});
