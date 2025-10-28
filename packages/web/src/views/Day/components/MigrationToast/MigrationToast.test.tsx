import { toast } from "react-toastify";
import { showMigrationToast } from "./MigrationToast";

jest.mock("react-toastify");

describe("MigrationToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows migration forward toast with correct message", () => {
    const mockOnNavigate = jest.fn();

    showMigrationToast("forward", mockOnNavigate);

    expect(toast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        autoClose: 5000,
        position: "bottom-left",
      }),
    );
  });

  it("shows migration backward toast with correct message", () => {
    const mockOnNavigate = jest.fn();

    showMigrationToast("backward", mockOnNavigate);

    expect(toast).toHaveBeenCalled();
  });
});
