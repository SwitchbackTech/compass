import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const mockUseUser = mock();
mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: mockUseUser,
}));

// This module is also imported for real by useTasksRemovalNotice.test.ts, and
// bun:test's mock.module is process-wide and order-dependent — wrap the real
// exports instead of replacing the module outright, so that file's import of
// createUseTasksRemovalNotice still resolves once this suite's mock is off.
const actualUseTasksRemovalNoticeModule = await import(
  "./useTasksRemovalNotice"
);
const mockUseTasksRemovalNotice = mock();
let isUseTasksRemovalNoticeMocked = true;

mock.module("./useTasksRemovalNotice", () => ({
  ...actualUseTasksRemovalNoticeModule,
  useTasksRemovalNotice: (
    ...args: Parameters<
      typeof actualUseTasksRemovalNoticeModule.useTasksRemovalNotice
    >
  ) =>
    isUseTasksRemovalNoticeMocked
      ? mockUseTasksRemovalNotice(...args)
      : actualUseTasksRemovalNoticeModule.useTasksRemovalNotice(...args),
}));

// Same fragility as useExportDataCmdItems.test.ts: these modules are also
// imported for real by other test files (export-user-data.util.test.ts,
// status-toast/error-toast consumers elsewhere), and bun:test's mock.module
// is process-wide and order-dependent — wrap the real export instead of
// replacing it outright, and only swap in the mock while this suite runs.
const actualRunExportMyData = (
  await import("@web/common/storage/offline-data/export-user-data.util")
).runExportMyData;
const mockRunExportMyData = mock();
let isRunExportMyDataMocked = true;

mock.module(
  "@web/common/storage/offline-data/export-user-data.util",
  () => ({
    runExportMyData: (...args: Parameters<typeof actualRunExportMyData>) =>
      isRunExportMyDataMocked
        ? mockRunExportMyData(...args)
        : actualRunExportMyData(...args),
  }),
);

const actualShowStatusToast = (
  await import("@web/common/utils/toast/status-toast.util")
).showStatusToast;
const mockShowStatusToast = mock();
let isStatusToastMocked = true;

mock.module("@web/common/utils/toast/status-toast.util", () => ({
  showStatusToast: (...args: Parameters<typeof actualShowStatusToast>) =>
    isStatusToastMocked
      ? mockShowStatusToast(...args)
      : actualShowStatusToast(...args),
}));

const actualShowErrorToast = (
  await import("@web/common/utils/toast/error-toast.util")
).showErrorToast;
const mockShowErrorToast = mock();
let isErrorToastMocked = true;

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  showErrorToast: (...args: Parameters<typeof actualShowErrorToast>) =>
    isErrorToastMocked
      ? mockShowErrorToast(...args)
      : actualShowErrorToast(...args),
}));

afterAll(() => {
  isUseTasksRemovalNoticeMocked = false;
  isRunExportMyDataMocked = false;
  isStatusToastMocked = false;
  isErrorToastMocked = false;
});

// This file statically imports TasksRemovalNotice via PlannerSidebar.tsx
// elsewhere; cache-bust so this file's mocks apply, matching
// useExportDataCmdItems.test.ts.
async function importComponent() {
  const moduleUrl = new URL(
    `./TasksRemovalNotice.tsx?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return (await import(moduleUrl.href)) as typeof import("./TasksRemovalNotice");
}

describe("TasksRemovalNotice", () => {
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

  it("renders nothing when not visible", async () => {
    mockUseTasksRemovalNotice.mockReturnValue({ visible: false, dismiss: mock() });
    const { TasksRemovalNotice } = await importComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when visible but there's no email", async () => {
    mockUseUser.mockReturnValue({ email: undefined });
    const { TasksRemovalNotice } = await importComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when visible with an email but not authenticated (e.g. a stale cached email right after sign-out)", async () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const { TasksRemovalNotice } = await importComponent();

    const { container } = render(<TasksRemovalNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the card with the export CTA and a dismiss control", async () => {
    const { TasksRemovalNotice } = await importComponent();

    render(<TasksRemovalNotice />);

    expect(screen.getByText(/tasks and someday were removed/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Export my data" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });

  it("calls dismiss when the dismiss control is clicked", async () => {
    const mockDismiss = mock();
    mockUseTasksRemovalNotice.mockReturnValue({
      visible: true,
      dismiss: mockDismiss,
    });
    const { TasksRemovalNotice } = await importComponent();

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
    const { TasksRemovalNotice } = await importComponent();

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
    const { TasksRemovalNotice } = await importComponent();

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
    const { TasksRemovalNotice } = await importComponent();

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
    expect(
      screen.getByText("Couldn't export your data."),
    ).toBeTruthy();
  });
});
