import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
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
// cache-bust so this file's useSession mock applies, matching
// useSubscribeCmdItems.test.ts. runExportMyData is injected directly via
// createUseExportDataCmdItems below instead of mock.module — that
// dependency's module is also imported for real by
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
  const mockRunExportMyData = mock();

  const buildHook = async () => {
    const { createUseExportDataCmdItems } = await importHookFactory();
    return createUseExportDataCmdItems({
      runExportMyData: mockRunExportMyData,
    });
  };

  beforeEach(() => {
    mockUseSession.mockClear();
    mockRunExportMyData.mockClear();
    mockShowStatusToast.mockClear();
    mockShowErrorToast.mockClear();

    mockUseSession.mockReturnValue({ authenticated: true });
    mockRunExportMyData.mockResolvedValue(undefined);
  });

  it("returns no items when unauthenticated", async () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const useExportDataCmdItems = await buildHook();

    const { result } = renderHook(() => useExportDataCmdItems());

    expect(result.current).toEqual([]);
  });

  it("runs the export and shows a success toast", async () => {
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

    expect(mockRunExportMyData).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
  });

  it("shows an error toast when the export fails", async () => {
    mockRunExportMyData.mockRejectedValue(new Error("dexie is closed"));
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
    expect(mockShowStatusToast).not.toHaveBeenCalled();
  });
});
