import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { afterEach, describe, expect, it } from "bun:test";

const modKey = resolveModifier("Mod") === "Meta" ? "Meta" : "Control";

const pressWindowKey = (init: KeyboardEventInit) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, ...init }),
    );
  });
};

const releaseWindowKey = (init: KeyboardEventInit) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keyup", { bubbles: true, ...init }),
    );
  });
};

describe("WelcomeGuideBody", () => {
  afterEach(() => {
    releaseWindowKey({ key: modKey });
  });

  it("explains that numbered shortcuts open the FAQ", () => {
    render(<WelcomeGuideBody />);

    expect(screen.getByText(/to see keys, then press 1–5/)).toBeTruthy();
  });

  it("toggles a FAQ with a bare digit", async () => {
    render(<WelcomeGuideBody />);

    const question = screen.getByRole("button", {
      name: "Who is Compass for?",
    });
    expect(question).toHaveAttribute("aria-expanded", "false");

    pressWindowKey({ key: "1", code: "Digit1" });

    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/Compass is for busy professionals who live at/),
    ).toBeTruthy();

    pressWindowKey({ key: "1", code: "Digit1" });
    expect(question).toHaveAttribute("aria-expanded", "false");
  });

  it("reveals numbered keycaps while Mod is held", async () => {
    render(<WelcomeGuideBody />);

    expect(screen.queryByText("1")).toBeNull();

    pressWindowKey({ key: modKey });

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();

    releaseWindowKey({ key: modKey });

    expect(screen.queryByText("1")).toBeNull();
  });

  it("still lets a click expand a question", async () => {
    const user = userEvent.setup();
    render(<WelcomeGuideBody />);

    const question = screen.getByRole("button", {
      name: "How is Compass different?",
    });
    await user.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
  });
});
