import { EVENT_DELETED_TOAST_ID } from "@web/common/constants/toast.constants";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const toast = Object.assign(mock(), {
  update: mock(),
});

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { showRestoredToast } =
  require("@web/common/utils/toast/deleted-toast.util") as typeof import("@web/common/utils/toast/deleted-toast.util");

describe("showRestoredToast", () => {
  beforeEach(() => {
    toast.mockClear();
    toast.update.mockClear();
  });

  it('updates the "Deleted" toast in place to "Restored"', () => {
    showRestoredToast();

    expect(toast.update).toHaveBeenCalledWith(
      EVENT_DELETED_TOAST_ID,
      expect.objectContaining({
        render: "Restored",
        autoClose: expect.any(Number),
      }),
    );
  });

  it("never creates a new toast, so it's a no-op once the toast is gone", () => {
    // `toast.update` on a dismissed id is a no-op in react-toastify; we must not
    // fall back to `toast(...)`, which would stack a fresh "Restored" toast even
    // after the "Deleted" toast disappeared.
    showRestoredToast();

    expect(toast).not.toHaveBeenCalled();
  });
});
