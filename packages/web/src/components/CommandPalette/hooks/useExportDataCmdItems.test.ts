import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const { port, mocks } = createTestToastPort();

afterAll(() => {
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
    mocks.toast.mockClear();
    mocks.toast.error.mockClear();
    registerToastPort(port);
    mockUseSession.mockClear();
    mockRunExportMyData.mockClear();

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
      expect(mocks.toast).toHaveBeenCalledWith(
        "Data exported",
        expect.objectContaining({ toastId: "export-my-data" }),
      );
    });

    expect(mockRunExportMyData).toHaveBeenCalledTimes(1);
    expect(mocks.toast.error).not.toHaveBeenCalled();
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
      expect(mocks.toast.error).toHaveBeenCalledWith(
        "Couldn't export your data. Please try again.",
        expect.objectContaining({ toastId: "export-my-data" }),
      );
    });
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
