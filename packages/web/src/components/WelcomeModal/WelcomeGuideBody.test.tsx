import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { WelcomeLinks } from "./WelcomeLinks";
import { afterEach, describe, expect, it, mock } from "bun:test";

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

const renderWelcomeGuide = () =>
  render(
    <WelcomeGuideBody>
      <WelcomeLinks />
    </WelcomeGuideBody>,
  );

const captureLinkClick = (name: string) => {
  const link = screen.getByRole("link", { name });
  const onClick = mock((event: Event) => {
    event.preventDefault();
  });
  link.addEventListener("click", onClick);
  return onClick;
};

describe("WelcomeGuideBody", () => {
  afterEach(() => {
    releaseWindowKey({ key: modKey });
  });

  it("explains that numbered shortcuts open the FAQ", () => {
    renderWelcomeGuide();

    expect(screen.getByText(/Tip:/)).toBeTruthy();
    expect(screen.getByText(/to see keys, then press a number/)).toBeTruthy();
    expect(screen.queryByText(/The same hold reveals jump keys/)).toBeNull();
  });

  it("toggles a FAQ with a bare digit", async () => {
    renderWelcomeGuide();

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
    renderWelcomeGuide();

    expect(screen.queryByText("1")).toBeNull();

    pressWindowKey({ key: modKey });

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();

    releaseWindowKey({ key: modKey });

    expect(screen.queryByText("1")).toBeNull();
    expect(screen.queryByText("6")).toBeNull();
  });

  it("still lets a click expand a question", async () => {
    const user = userEvent.setup();
    renderWelcomeGuide();

    const question = screen.getByRole("button", {
      name: "How is Compass different?",
    });
    await user.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
  });

  it("explains why the mouse does not work", async () => {
    const user = userEvent.setup();
    renderWelcomeGuide();

    await user.click(
      screen.getByRole("button", { name: "Why doesn't my mouse work?" }),
    );

    expect(
      screen.getByText(
        /Compass is keyboard-driven to help users stay in the flow/,
      ),
    ).toBeTruthy();
  });

  it("styles the legend and palette shortcuts in the lost FAQ", async () => {
    const user = userEvent.setup();
    renderWelcomeGuide();

    await user.click(
      screen.getByRole("button", {
        name: "I don't know any shortcuts yet. Will I be lost?",
      }),
    );

    expect(screen.getByText("?").closest(".c-keycap")).toBeTruthy();
    expect(screen.getByText("K").closest(".c-keycap")).toBeTruthy();
    expect(screen.getByText(/and \? opens the full legend/)).toBeTruthy();
  });

  it("opens footer links with digits 6 through 0", () => {
    renderWelcomeGuide();

    const x = captureLinkClick("X (Twitter)");
    const linkedin = captureLinkClick("LinkedIn");
    const github = captureLinkClick("GitHub");
    const privacy = captureLinkClick("Privacy");
    const terms = captureLinkClick("Terms");

    pressWindowKey({ key: "6", code: "Digit6" });
    pressWindowKey({ key: "7", code: "Digit7" });
    pressWindowKey({ key: "8", code: "Digit8" });
    pressWindowKey({ key: "9", code: "Digit9" });
    pressWindowKey({ key: "0", code: "Digit0" });

    expect(x).toHaveBeenCalledTimes(1);
    expect(linkedin).toHaveBeenCalledTimes(1);
    expect(github).toHaveBeenCalledTimes(1);
    expect(privacy).toHaveBeenCalledTimes(1);
    expect(terms).toHaveBeenCalledTimes(1);
  });
});
