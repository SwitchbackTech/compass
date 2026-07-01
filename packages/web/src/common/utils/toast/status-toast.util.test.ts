import { beforeEach, describe, expect, it, mock } from "bun:test";

const toast = Object.assign(mock(), {
  update: mock(),
});

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { showStatusToast } =
  require("@web/common/utils/toast/status-toast.util") as typeof import("@web/common/utils/toast/status-toast.util");

describe("showStatusToast", () => {
  beforeEach(() => {
    toast.mockClear();
    toast.update.mockClear();
  });

  it("shows the message with the given toast id", () => {
    showStatusToast("task-migration", "Migrated forward");

    expect(toast).toHaveBeenCalledWith(
      "Migrated forward",
      expect.objectContaining({ toastId: "task-migration" }),
    );
  });

  it("hides the close button and progress bar", () => {
    showStatusToast("task-deleted", "Deleted");

    expect(toast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        closeButton: false,
        hideProgressBar: true,
      }),
    );
  });

  it("updates the deduped toast so rapid calls show the latest message", () => {
    showStatusToast("task-migration", "Migrated forward");
    showStatusToast("task-migration", "Migrated backward");

    // Both calls use the same toastId, so react-toastify keeps a single toast
    expect(toast.update).toHaveBeenNthCalledWith(
      2,
      "task-migration",
      expect.objectContaining({
        render: "Migrated backward",
        autoClose: expect.any(Number),
      }),
    );
  });
});
