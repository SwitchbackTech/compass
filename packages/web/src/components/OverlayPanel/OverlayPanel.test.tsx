import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { describe, expect, it } from "bun:test";

describe("OverlayPanel", () => {
  it("locks app shortcuts while mounted and clears on unmount", () => {
    const { unmount } = render(
      <OverlayPanel title="Confirm" onDismiss={() => {}} />,
    );

    expect(document.body.dataset.appLocked).toBe("true");
    unmount();
    expect(document.body.dataset.appLocked).toBeUndefined();
  });

  it("keeps the app locked when multiple panels are stacked", () => {
    const { unmount: unmountFirst } = render(
      <OverlayPanel title="First" onDismiss={() => {}} />,
    );
    const { unmount: unmountSecond } = render(
      <OverlayPanel title="Second" onDismiss={() => {}} />,
    );

    expect(document.body.dataset.appLocked).toBe("true");

    unmountFirst();
    expect(document.body.dataset.appLocked).toBe("true");
    expect(screen.getByRole("dialog", { name: "Second" })).toBeInTheDocument();

    unmountSecond();
    expect(document.body.dataset.appLocked).toBeUndefined();
  });

  it("locks status panels too", () => {
    const { unmount } = render(
      <OverlayPanel role="status" variant="status" message="Working…" />,
    );

    expect(document.body.dataset.appLocked).toBe("true");
    unmount();
    expect(document.body.dataset.appLocked).toBeUndefined();
  });

  it("names untitled dialogs via ariaLabel", () => {
    render(
      <OverlayPanel ariaLabel="Welcome guide" onDismiss={() => {}}>
        <button type="button">Close</button>
      </OverlayPanel>,
    );

    expect(
      screen.getByRole("dialog", { name: "Welcome guide" }),
    ).toBeInTheDocument();
  });

  it("traps Tab within the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside</button>
        <OverlayPanel title="Confirm" onDismiss={() => {}}>
          <button type="button">First</button>
          <button type="button">Last</button>
        </OverlayPanel>
      </>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    expect(first).toHaveFocus();

    await user.tab();
    expect(last).toHaveFocus();

    await user.tab();
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
