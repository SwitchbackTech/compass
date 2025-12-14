import { useDroppable } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { Droppable } from "@web/components/DND/Droppable";

jest.mock("@dnd-kit/core", () => ({
  useDroppable: jest.fn(),
}));

describe("Droppable", () => {
  const mockDndProps = {
    id: "test-droppable",
    data: { containerWidth: 100 },
  };

  beforeEach(() => {
    (useDroppable as jest.Mock).mockReturnValue({
      setNodeRef: jest.fn(),
      active: null,
      isOver: false,
      node: { current: null },
      over: null,
      rect: null,
    });
  });

  it("renders children correctly", () => {
    render(
      <Droppable dndProps={mockDndProps} as="div">
        <div>Child Content</div>
      </Droppable>,
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });
});
