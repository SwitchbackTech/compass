import { renderHook, waitFor } from "@testing-library/react";
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

// Same fragility as useSubscribeCmdItems.test.ts: react-toastify's binding
// is process-wide and shared across suites, so mock the two util modules
// useExportDataCmdItems.ts imports directly instead.
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
  isStatusToastMocked = false;
  isErrorToastMocked = false;
  mockUseSession.mockReturnValue({
    authenticated: false,
    setAuthenticated: () => {},
  });
});

// CommandPalette.tsx statically imports the default-wired useExportDataCmdItems;
// cache-bust so this file's useSession/useUser mocks apply, matching
// useSubscribeCmdItems.test.ts. The export-data dependencies themselves
// (collectExportData, downloadAsJsonFile, clearExportedTasks, notifyExport)
// are injected directly via createUseExportDataCmdItems below instead of
// mock.module — that dependency's module is also imported for real by
// export-user-data.util.test.ts, and mock.module's process-wide, order-
// dependent replacement proved unreliable across files for it.
async function importHookFactory() {
  const moduleUrl = new URL(
    `./useExportDataCmdItems.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return import(moduleUrl.href) as Promise<
    typeof import("./useExportDataCmdItems")
  >;
}

describe("useExportDataCmdItems", () => {
  const mockCollectExportData = mock();
  const mockDownloadAsJsonFile = mock();
  const mockClearExportedTasks = mock();
  const mockNotifyExport = mock();
  const mockGetExportFilename = mock();

  const buildHook = async () => {
    const { createUseExportDataCmdItems } = await importHookFactory();
    return createUseExportDataCmdItems({
      collectExportData: mockCollectExportData,
      downloadAsJsonFile: mockDownloadAsJsonFile,
      clearExportedTasks: mockClearExportedTasks,
      notifyExport: mockNotifyExport,
      getExportFilename: mockGetExportFilename,
    });
  };

  beforeEach(() => {
    mockUseSession.mockClear();
    mockUseUser.mockClear();
    mockCollectExportData.mockClear();
    mockDownloadAsJsonFile.mockClear();
    mockClearExportedTasks.mockClear();
    mockNotifyExport.mockClear();
    mockGetExportFilename.mockClear();
    mockShowStatusToast.mockClear();
    mockShowErrorToast.mockClear();

    mockUseSession.mockReturnValue({ authenticated: true });
    mockUseUser.mockReturnValue({ email: "user@example.com" });
    mockCollectExportData.mockResolvedValue({
      exportedAt: "2026-07-15T00:00:00.000Z",
      version: 1,
      tasks: [],
      events: [],
    });
    mockClearExportedTasks.mockResolvedValue(undefined);
    mockGetExportFilename.mockReturnValue("compass-export-2026-07-15.json");
  });

  it("returns no items when unauthenticated", async () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns no items when signed in but email is missing", async () => {
    mockUseUser.mockReturnValue({ email: undefined });
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());

    expect(result.current).toEqual([]);
  });

  it("downloads the export, notifies the webhook with the user's email, then clears tasks", async () => {
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());
    const item = result.current.find((item) => item.id === "export-my-data");

    await act(async () => {
      item?.onClick?.();
    });

    await waitFor(() => {
      expect(mockShowStatusToast).toHaveBeenCalledWith(
        "export-my-data",
        "Data exported",
      );
    });

    expect(mockDownloadAsJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1 }),
      "compass-export-2026-07-15.json",
    );
    expect(mockNotifyExport).toHaveBeenCalledWith("user@example.com");
    expect(mockClearExportedTasks).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });

  it("shows an error toast and does not clear tasks when collecting export data fails", async () => {
    mockCollectExportData.mockRejectedValue(new Error("dexie is closed"));
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());
    const item = result.current.find((item) => item.id === "export-my-data");

    await act(async () => {
      item?.onClick?.();
    });

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Couldn't export your data. Please try again.",
        { toastId: "export-my-data" },
      );
    });
    expect(mockClearExportedTasks).not.toHaveBeenCalled();
    expect(mockShowStatusToast).not.toHaveBeenCalled();
  });

  it("still shows success (not an error) when clearing the tasks table fails after a successful download", async () => {
    mockClearExportedTasks.mockRejectedValue(new Error("write conflict"));
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());
    const item = result.current.find((item) => item.id === "export-my-data");

    await act(async () => {
      item?.onClick?.();
    });

    await waitFor(() => {
      expect(mockShowStatusToast).toHaveBeenCalledWith(
        "export-my-data",
        "Data exported",
      );
    });
    expect(mockDownloadAsJsonFile).toHaveBeenCalledTimes(1);
    expect(mockNotifyExport).toHaveBeenCalledWith("user@example.com");
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });
});
