import { render, screen } from "@testing-library/react";
import { DNDContext } from "./DNDContext";

jest.mock("@dnd-kit/core", () => ({
  DndContext: jest.fn(({ children }) => (
    <div data-testid="dnd-context">{children}</div>
  )),
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}));

describe("DNDContext", () => {
  it("renders children wrapped in DndContext", () => {
    render(
      <DNDContext>
        <div data-testid="child">Child</div>
      </DNDContext>,
    );

    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
