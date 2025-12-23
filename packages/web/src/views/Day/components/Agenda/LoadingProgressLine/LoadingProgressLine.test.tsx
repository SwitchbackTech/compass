import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { LoadingProgressLine } from "./LoadingProgressLine";

describe("LoadingProgressLine", () => {
  it("should render the progress line", () => {
    render(<LoadingProgressLine />);

    const progressLine = screen.getByTestId("loading-progress-line");
    expect(progressLine).toBeInTheDocument();
  });

  it("should have absolute positioning at top", () => {
    render(<LoadingProgressLine />);

    const progressLine = screen.getByTestId("loading-progress-line");
    expect(progressLine).toHaveClass("absolute", "top-0");
  });

  it("should span full width", () => {
    render(<LoadingProgressLine />);

    const progressLine = screen.getByTestId("loading-progress-line");
    expect(progressLine).toHaveClass("left-0", "right-0");
  });
});
