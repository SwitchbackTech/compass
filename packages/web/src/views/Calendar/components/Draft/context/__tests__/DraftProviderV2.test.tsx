import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";
import { DraftContextV2, DraftProviderV2 } from "../DraftProviderV2";

jest.mock("@web/views/Forms/hooks/useOpenEventForm");
jest.mock("@web/views/Forms/hooks/useCloseEventForm");
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
  const mockCloseEventForm = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    (useOpenEventForm as jest.Mock).mockReturnValue(mockOpenEventForm);
    (useCloseEventForm as jest.Mock).mockReturnValue(mockCloseEventForm);
    (useSaveEventForm as jest.Mock).mockReturnValue(mockOnSave);
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
    expect(mockCloseEventForm).toHaveBeenCalled();

    screen.getByText("Save").click();
    expect(mockOnSave).toHaveBeenCalled();
  });
});
