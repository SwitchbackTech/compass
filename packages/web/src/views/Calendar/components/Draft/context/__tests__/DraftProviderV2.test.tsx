import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import {
  DraftContextV2,
  DraftProviderV2,
} from "@web/views/Calendar/components/Draft/context/DraftProviderV2";

const TestComponent = () => {
  const context = useContext(DraftContextV2);
  if (!context) return <div>No Context</div>;
  return (
    <div>
      <div data-testid="draft">
        {context.draft ? "Draft Exists" : "No Draft"}
      </div>
      <button onClick={() => context.openEventForm()}>Open</button>
      <button onClick={context.closeOpenedAtCursor}>Close</button>
      <button onClick={() => context.onSave(null)}>Save</button>
    </div>
  );
};

describe("DraftProviderV2", () => {
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
