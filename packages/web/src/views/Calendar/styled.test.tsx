import { render, screen } from "@testing-library/react";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { Styled, StyledCalendar } from "@web/views/Calendar/styled";

describe("Styled Components", () => {
  describe("Styled", () => {
    it("should render with correct styles", () => {
      const { container } = render(<Styled>Content</Styled>);
      const element = container.firstChild as HTMLElement;

      expect(element).toHaveStyle({
        height: "100vh",
        overflow: "hidden",
        width: "100vw",
      });
    });
  });

  describe("StyledCalendar", () => {
    it("should render children", () => {
      render(
        <StyledCalendar>
          <div data-testid="child">Child Content</div>
        </StyledCalendar>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("should have correct id and classes", () => {
      const { container } = render(<StyledCalendar>Content</StyledCalendar>);
      const element = container.firstChild as HTMLElement;

      expect(element).toHaveAttribute("id", ID_MAIN);
      expect(element).toHaveClass(
        "bg-bg-primary",
        "flex",
        "h-screen",
        "overflow-hidden",
        "flex-1",
        "flex-col",
        "items-center",
        "justify-center",
        "p-8",
      );
    });
  });
});
