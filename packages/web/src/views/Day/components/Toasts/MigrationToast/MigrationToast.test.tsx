import { beforeEach, describe, expect, it, mock } from "bun:test";

const toast = Object.assign(mock(), {
  update: mock(),
});

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { MIGRATION_TOAST_ID, showMigrationToast } =
  require("@web/views/Day/components/Toasts/MigrationToast/MigrationToast") as typeof import("@web/views/Day/components/Toasts/MigrationToast/MigrationToast");

describe("showMigrationToast", () => {
  beforeEach(() => {
    toast.mockClear();
    toast.update.mockClear();
  });

  it("shows forward migration message", () => {
    showMigrationToast("forward");

    expect(toast).toHaveBeenCalledWith(
      "Migrated forward",
      expect.objectContaining({ toastId: MIGRATION_TOAST_ID }),
    );
  });

  it("shows backward migration message", () => {
    showMigrationToast("backward");

    expect(toast).toHaveBeenCalledWith(
      "Migrated backward",
      expect.objectContaining({ toastId: MIGRATION_TOAST_ID }),
    );
  });

  it("hides the close button and progress bar", () => {
    showMigrationToast("forward");

    expect(toast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        closeButton: false,
        hideProgressBar: true,
      }),
    );
  });

  it("updates the deduped toast so rapid migrations show the latest message", () => {
    showMigrationToast("forward");
    showMigrationToast("backward");

    // Both calls use the same toastId, so react-toastify keeps a single toast
    expect(toast).toHaveBeenNthCalledWith(
      2,
      "Migrated backward",
      expect.objectContaining({ toastId: MIGRATION_TOAST_ID }),
    );
    expect(toast.update).toHaveBeenNthCalledWith(
      2,
      MIGRATION_TOAST_ID,
      expect.objectContaining({ render: "Migrated backward" }),
    );
  });
});
