import { XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useSession } from "@web/auth/compass/session/useSession";
import { EXPORT_MY_DATA_TOAST_ID } from "@web/common/constants/toast.constants";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { useTasksRemovalNotice } from "./useTasksRemovalNotice";

type TasksRemovalNoticeDependencies = {
  useTasksRemovalNotice: typeof useTasksRemovalNotice;
  runExportMyData: typeof runExportMyData;
  showStatusToast: typeof showStatusToast;
  showErrorToast: typeof showErrorToast;
};

type ExportStatus = "idle" | "exporting" | "error";

export function createTasksRemovalNotice({
  useTasksRemovalNotice,
  runExportMyData,
  showStatusToast,
  showErrorToast,
}: TasksRemovalNoticeDependencies) {
  return function TasksRemovalNotice() {
    const { visible, dismiss } = useTasksRemovalNotice();
    const { authenticated } = useSession();
    const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
    // A ref, not just exportStatus: two clicks in the same synchronous event
    // batch both read state before React flushes the first setExportStatus,
    // so state alone can't block the second click.
    const isExportingRef = useRef(false);

    // Signed-in only, matching the command palette's export item.
    if (!visible || !authenticated) return null;

    const handleExport = () => {
      if (isExportingRef.current) return;
      isExportingRef.current = true;
      setExportStatus("exporting");

      runExportMyData()
        .then(() => {
          showStatusToast(EXPORT_MY_DATA_TOAST_ID, "Data exported");
          // A successful export is a one-shot action, like the command
          // palette's version — the card doesn't need to linger afterward.
          dismiss();
        })
        .catch(() => {
          isExportingRef.current = false;
          setExportStatus("error");
          showErrorToast("Couldn't export your data. Please try again.", {
            toastId: EXPORT_MY_DATA_TOAST_ID,
          });
        });
    };

    return (
      <section
        aria-label="Tasks removed"
        className="flex flex-col gap-2 rounded-lg bg-panel-badge-bg p-3 text-xs"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-text-lighter leading-relaxed">
            Tasks and Someday were removed from Compass. Your old task data is
            still saved locally — export it below before it's cleared. If you
            signed up before July 15, 2026 and want your Someday events, email
            tyler@switchback.tech.
          </p>
          <button
            aria-label="Dismiss"
            className="c-focus-ring shrink-0 rounded-xs text-text-light-inactive hover:text-text-lighter"
            onClick={dismiss}
            type="button"
          >
            <XIcon aria-hidden="true" size={14} />
          </button>
        </div>

        <button
          className="c-focus-ring self-start rounded-xs bg-accent-primary px-2 py-1 font-medium text-s text-text-dark hover:brightness-110 disabled:opacity-60"
          disabled={exportStatus === "exporting"}
          onClick={handleExport}
          type="button"
        >
          {exportStatus === "exporting" ? "Exporting…" : "Export my data"}
        </button>

        {exportStatus === "error" ? (
          <p className="text-status-error">Couldn't export your data.</p>
        ) : null}
      </section>
    );
  };
}

export const TasksRemovalNotice = createTasksRemovalNotice({
  useTasksRemovalNotice,
  runExportMyData,
  showStatusToast,
  showErrorToast,
});
