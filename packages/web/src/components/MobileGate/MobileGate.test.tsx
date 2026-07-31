import { beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileGate } from "./MobileGate";

describe("MobileGate", () => {
  const mockWindowOpen = mock();
  const mockWriteText = mock(() => Promise.resolve());

  beforeEach(() => {
    mockWindowOpen.mockClear();
    mockWriteText.mockClear();
    window.open = mockWindowOpen;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mockWriteText },
    });
  });

  describe("Component Rendering", () => {
    it("renders the desktop-first title", () => {
      render(<MobileGate />);

      expect(
        screen.getByText("Open Compass on a computer"),
      ).toBeInTheDocument();
    });

    it("renders the descriptive message", () => {
      render(<MobileGate />);

      expect(
        screen.getByText(/Copy this link and open it on a laptop or desktop/),
      ).toBeInTheDocument();
    });

    it("renders the copy-link and waitlist buttons", () => {
      render(<MobileGate />);

      expect(
        screen.getByRole("button", { name: /copy link for desktop/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /join mobile waitlist/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Copy link", () => {
    it("copies the current URL to the clipboard", async () => {
      const user = userEvent.setup();
      render(<MobileGate />);

      await user.click(
        screen.getByRole("button", { name: /copy link for desktop/i }),
      );

      expect(
        await screen.findByRole("button", { name: /link copied/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Waitlist Button Behavior", () => {
    it("opens waitlist URL in new tab when clicked", async () => {
      const user = userEvent.setup();
      render(<MobileGate />);

      const waitlistButton = screen.getByRole("button", {
        name: /join mobile waitlist/i,
      });
      await user.click(waitlistButton);

      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://tylerdane.kit.com/compass-mobile",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  describe("Accessibility", () => {
    it("renders heading for the title", () => {
      render(<MobileGate />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Open Compass on a computer");
    });
  });
});
