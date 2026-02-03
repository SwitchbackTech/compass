import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { MobileGate } from "./MobileGate";

describe("MobileGate", () => {
  const mockWindowOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = mockWindowOpen;
  });

  describe("Component Rendering", () => {
    it("renders the title message", () => {
      render(<MobileGate />);

      expect(
        screen.getByText("Compass isn't built for mobile yet"),
      ).toBeInTheDocument();
    });

    it("renders the descriptive message", () => {
      render(<MobileGate />);

      expect(
        screen.getByText(
          /We're focusing on perfecting the web experience first/,
        ),
      ).toBeInTheDocument();
    });

    it("renders the Join Mobile Waitlist button", () => {
      render(<MobileGate />);

      const waitlistButton = screen.getByRole("button", {
        name: /join mobile waitlist/i,
      });
      expect(waitlistButton).toBeInTheDocument();
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
    it("has proper button role", () => {
      render(<MobileGate />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Join Mobile Waitlist");
    });

    it("renders heading for the title", () => {
      render(<MobileGate />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Compass isn't built for mobile yet");
    });
  });
});
