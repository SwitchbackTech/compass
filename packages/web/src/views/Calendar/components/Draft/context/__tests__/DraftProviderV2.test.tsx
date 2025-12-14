import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import {
  DraftContextV2,
  DraftProviderV2,
} from "@web/views/Calendar/components/Draft/context/DraftProviderV2";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

jest.mock("@web/common/hooks/useOpenAtCursor");
jest.mock("@web/views/Forms/hooks/useOpenEventForm");
jest.mock("@web/views/Forms/hooks/useSaveEventForm");
jest.mock("@web/views/Day/hooks/events/useOpenAgendaEventPreview");
jest.mock("@web/views/Day/hooks/events/useOpenEventContextMenu");

const mockSetOpenAtMousePosition = jest.fn();
const mockOpenEventForm = jest.fn();
const mockOnSave = jest.fn();
const mockCloseOpenAtCursor = jest.fn();

(useOpenAtCursor as jest.Mock).mockReturnValue({
  setOpenAtMousePosition: mockSetOpenAtMousePosition,
  closeOpenAtCursor: mockCloseOpenAtCursor,
});
(useOpenEventForm as jest.Mock).mockReturnValue(mockOpenEventForm);
(useSaveEventForm as jest.Mock).mockReturnValue(mockOnSave);

const TestComponent = () => {
  const context = useContext(DraftContextV2);
  if (!context) return <div>No Context</div>;
  return (
    <div>
      <div data-testid="draft">
        {context.draft ? "Draft Exists" : "No Draft"}
      </div>
      <button onClick={() => context.openEventForm()}>Open</button>
      <button onClick={context.handleCloseOpenAtCursor}>Close</button>
      <button onClick={() => context.onSave(null)}>Save</button>
    </div>
  );
};

describe("DraftProviderV2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockCloseOpenAtCursor).toHaveBeenCalled();

    screen.getByText("Save").click();
    expect(mockOnSave).toHaveBeenCalled();
  });
});
