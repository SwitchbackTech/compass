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

  it("skips focus restore when skipFocusRestoreRef is set", () => {
    const skipFocusRestoreRef = { current: false };
    const { rerender } = render(<button type="button">Outside</button>);
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();

    rerender(
      <>
        <button type="button">Outside</button>
        <OverlayPanel
          title="Confirm"
          onDismiss={() => {}}
          skipFocusRestoreRef={skipFocusRestoreRef}
        >
          <button type="button">Inside</button>
        </OverlayPanel>
      </>,
    );
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();

    skipFocusRestoreRef.current = true;
    rerender(<button type="button">Outside</button>);
    expect(outside).not.toHaveFocus();
  });

  it("restores focus synchronously via restoreFocus on unmount", () => {
    const outside = document.createElement("button");
    outside.type = "button";
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(
      <OverlayPanel
        title="Confirm"
        onDismiss={() => {}}
        restoreFocus={() => outside.focus()}
      >
        <button type="button">Inside</button>
      </OverlayPanel>,
    );
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();

    unmount();
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("focuses initialFocusRef instead of the first focusable", () => {
    const initialFocusRef = { current: null as HTMLButtonElement | null };
    render(
      <OverlayPanel
        title="Confirm"
        onDismiss={() => {}}
        initialFocusRef={initialFocusRef}
      >
        <button type="button">First</button>
        <button
          type="button"
          ref={(node) => {
            initialFocusRef.current = node;
          }}
        >
          Preferred
        </button>
      </OverlayPanel>,
    );

    expect(screen.getByRole("button", { name: "Preferred" })).toHaveFocus();
  });

  it("calls onShiftEscape for Shift+Escape and onDismiss for Escape", async () => {
    const user = userEvent.setup();
    let dismissed = 0;
    let shifted = 0;
    const onDismiss = () => {
      dismissed += 1;
    };
    const onShiftEscape = () => {
      shifted += 1;
    };

    render(
      <OverlayPanel
        title="Confirm"
        onDismiss={onDismiss}
        onShiftEscape={onShiftEscape}
      >
        <button type="button">Inside</button>
      </OverlayPanel>,
    );

    const inside = screen.getByRole("button", { name: "Inside" });
    inside.focus();

    await user.keyboard("{Escape}");
    expect(dismissed).toBe(1);
    expect(shifted).toBe(0);

    await user.keyboard("{Shift>}{Escape}{/Shift}");
    expect(shifted).toBe(1);
    expect(dismissed).toBe(1);
  });
});
