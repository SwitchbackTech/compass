import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import { useOpenAtCursorPosition } from "@web/common/hooks/useMousePosition";
import {
  DraftContextV2,
  DraftProviderV2,
} from "@web/views/Calendar/components/Draft/context/DraftProviderV2";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

jest.mock("@web/common/hooks/useMousePosition");
jest.mock("@web/views/Forms/hooks/useOpenEventForm");
jest.mock("@web/views/Forms/hooks/useSaveEventForm");

const TestComponent = () => {
  const context = useContext(DraftContextV2);
  if (!context) return <div>No Context</div>;
  return (
    <div>
      <div data-testid="draft">
        {context.draft ? "Draft Exists" : "No Draft"}
      </div>
      <button onClick={() => context.openEventForm()}>Open</button>
      <button onClick={context.closeEventForm}>Close</button>
      <button onClick={() => context.onSave(null)}>Save</button>
    </div>
  );
};

describe("DraftProviderV2", () => {
  const mockOpenEventForm = jest.fn();
  const mockOnSave = jest.fn();
  const mockSetOpenAtMousePosition = jest.fn();

  beforeEach(() => {
    (useOpenEventForm as jest.Mock).mockReturnValue(mockOpenEventForm);
    (useSaveEventForm as jest.Mock).mockReturnValue(mockOnSave);
    (useOpenAtCursorPosition as jest.Mock).mockReturnValue({
      setOpenAtMousePosition: mockSetOpenAtMousePosition,
    });
  });

  it("should provide draft context values", () => {
    render(
      <DraftProviderV2>
        <TestComponent />
      </DraftProviderV2>,
    );

    expect(screen.getByTestId("draft")).toHaveTextContent("No Draft");

    screen.getByText("Open").click();
    expect(mockOpenEventForm).toHaveBeenCalled();

    screen.getByText("Close").click();
    expect(mockSetOpenAtMousePosition).toHaveBeenCalledWith(false);

    screen.getByText("Save").click();
    expect(mockOnSave).toHaveBeenCalled();
  });
});
