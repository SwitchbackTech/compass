import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideSkipButton } from "./GuideSkipButton";

describe("GuideSkipButton", () => {
  it("should call onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <GuideSkipButton
        onClick={handleClick}
        showSuccessMessage={false}
        isNowViewOverlay={false}
      />,
    );

    await user.click(screen.getByLabelText("Skip guide"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should have 'Skip guide' aria-label when not showing success message", () => {
    render(
      <GuideSkipButton
        onClick={jest.fn()}
        showSuccessMessage={false}
        isNowViewOverlay={false}
      />,
    );

    expect(screen.getByLabelText("Skip guide")).toBeInTheDocument();
  });

  it("should have 'Dismiss' aria-label when showing success message", () => {
    render(
      <GuideSkipButton
        onClick={jest.fn()}
        showSuccessMessage={true}
        isNowViewOverlay={false}
      />,
    );

    expect(screen.getByLabelText("Dismiss")).toBeInTheDocument();
  });

  it("should render 'Skip' text for Now view overlay", () => {
    render(
      <GuideSkipButton
        onClick={jest.fn()}
        showSuccessMessage={false}
        isNowViewOverlay={true}
      />,
    );

    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  it("should render X icon for non-Now view overlay", () => {
    const { container } = render(
      <GuideSkipButton
        onClick={jest.fn()}
        showSuccessMessage={false}
        isNowViewOverlay={false}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should not render X icon for Now view overlay", () => {
    const { container } = render(
      <GuideSkipButton
        onClick={jest.fn()}
        showSuccessMessage={false}
        isNowViewOverlay={true}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });
});
