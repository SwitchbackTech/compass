import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { createTasksRemovalNotice } from "./TasksRemovalNotice";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Matches useExportDataCmdItems.test.ts's convention: useSession/useUser are
// auth hooks with no injection seam of their own, so they're mock.module'd;
// everything else this component depends on is a plain function, injected
// via createTasksRemovalNotice below — no mock.module, no cache-busting.
const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const mockUseUser = mock();
mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: mockUseUser,
}));

describe("TasksRemovalNotice", () => {
  const mockUseTasksRemovalNotice = mock();
  const mockRunExportMyData = mock();
  const mockShowStatusToast = mock();
  const mockShowErrorToast = mock();

  const buildComponent = () =>
    createTasksRemovalNotice({
      useTasksRemovalNotice: mockUseTasksRemovalNotice,
      runExportMyData: mockRunExportMyData,
      showStatusToast: mockShowStatusToast,
      showErrorToast: mockShowErrorToast,
    });

  beforeEach(() => {
    mockUseSession.mockClear();
    mockUseUser.mockClear();
    mockUseTasksRemovalNotice.mockClear();
    mockRunExportMyData.mockClear();
    mockShowStatusToast.mockClear();
    mockShowErrorToast.mockClear();

    mockUseSession.mockReturnValue({ authenticated: true });
    mockUseUser.mockReturnValue({ email: "user@example.com" });
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: true,
      dismiss: mock(),
    });
    mockRunExportMyData.mockResolvedValue(undefined);
  });

  it("renders nothing when not visible", () => {
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: false,
      dismiss: mock(),
    });
    const TasksRemovalNotice = buildComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when visible but there's no email", () => {
    mockUseUser.mockReturnValue({ email: undefined });
    const TasksRemovalNotice = buildComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when visible with an email but not authenticated (e.g. a stale cached email right after sign-out)", () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const TasksRemovalNotice = buildComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the card with the export CTA and a dismiss control", () => {
    const TasksRemovalNotice = buildComponent();

    render(<TasksRemovalNotice />);

    expect(screen.getByText(/tasks and someday were removed/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export my data" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });

  it("calls dismiss when the dismiss control is clicked", () => {
    const mockDismiss = mock();
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: true,
      dismiss: mockDismiss,
    });
    const TasksRemovalNotice = buildComponent();

    render(<TasksRemovalNotice />);
    screen.getByRole("button", { name: "Dismiss" }).click();

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("exports, shows a success toast, and dismisses the card on a successful export", async () => {
    const mockDismiss = mock();
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: true,
      dismiss: mockDismiss,
    });
    const TasksRemovalNotice = buildComponent();

    render(<TasksRemovalNotice />);
    await act(async () => {
      screen.getByRole("button", { name: "Export my data" }).click();
    });

    await waitFor(() => {
      expect(mockShowStatusToast).toHaveBeenCalledWith(
        "export-my-data",
        "Data exported",
      );
    });

    expect(mockRunExportMyData).toHaveBeenCalledWith("user@example.com");
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });

  it("ignores a second click while an export is already in flight", async () => {
    let resolveExport: () => void = () => {};
    mockRunExportMyData.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveExport = resolve;
      }),
    );
    const TasksRemovalNotice = buildComponent();

    render(<TasksRemovalNotice />);
    const exportButton = screen.getByRole("button", { name: "Export my data" });

    act(() => {
      exportButton.click();
      exportButton.click();
    });

    expect(mockRunExportMyData).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExport();
    });
  });

  it("shows an error toast and keeps the card visible when the export fails", async () => {
    mockRunExportMyData.mockRejectedValue(new Error("dexie is closed"));
    const mockDismiss = mock();
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: true,
      dismiss: mockDismiss,
    });
    const TasksRemovalNotice = buildComponent();

    render(<TasksRemovalNotice />);
    await act(async () => {
      screen.getByRole("button", { name: "Export my data" }).click();
    });

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Couldn't export your data. Please try again.",
        { toastId: "export-my-data" },
      );
    });

    expect(mockDismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't export your data.")).toBeTruthy();
  });
});
