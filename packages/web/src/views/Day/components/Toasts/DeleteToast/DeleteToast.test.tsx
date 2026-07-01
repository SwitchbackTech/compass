import { beforeEach, describe, expect, it, mock } from "bun:test";

const toast = Object.assign(mock(), {
  update: mock(),
});

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { DELETE_TOAST_ID, showDeleteToast } =
  require("@web/views/Day/components/Toasts/DeleteToast/DeleteToast") as typeof import("@web/views/Day/components/Toasts/DeleteToast/DeleteToast");

describe("showDeleteToast", () => {
  beforeEach(() => {
    toast.mockClear();
    toast.update.mockClear();
  });

  it("shows the deleted message with a fixed toast id", () => {
    showDeleteToast();

    expect(toast).toHaveBeenCalledWith(
      "Deleted",
      expect.objectContaining({ toastId: DELETE_TOAST_ID }),
    );
  });

  it("hides the close button and progress bar", () => {
    showDeleteToast();

    expect(toast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        closeButton: false,
        hideProgressBar: true,
      }),
    );
  });

  it("refreshes the deduped toast so rapid deletions reset the timer", () => {
    showDeleteToast();
    showDeleteToast();

    // Both calls use the same toastId, so react-toastify keeps a single toast
    expect(toast.update).toHaveBeenCalledTimes(2);
    expect(toast.update).toHaveBeenLastCalledWith(
      DELETE_TOAST_ID,
      expect.objectContaining({ autoClose: expect.any(Number) }),
    );
  });
});
