import { DownloadIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { EXPORT_DATA_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  clearExportedTasks,
  collectExportData,
  downloadAsJsonFile,
  getExportFilename,
  notifyExport,
} from "@web/common/storage/offline-data/export-user-data.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

type ExportDataDependencies = {
  collectExportData: typeof collectExportData;
  downloadAsJsonFile: typeof downloadAsJsonFile;
  clearExportedTasks: typeof clearExportedTasks;
  notifyExport: typeof notifyExport;
  getExportFilename: typeof getExportFilename;
};

/**
 * Returns a command palette item that downloads the user's local IndexedDB
 * data (recoverable tasks + non-demo events) as a JSON file, notifies Tyler
 * via webhook so someday events can be pulled from Mongo by hand, then
 * clears the retained tasks table. Signed-in only: the webhook exists to
 * locate a user's someday events, which only signed-in users have.
 */
export function createUseExportDataCmdItems({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  notifyExport,
  getExportFilename,
}: ExportDataDependencies) {
  return function useExportDataCmdItems(): CommandItem[] {
    const { authenticated } = useSession();
    const { email } = useUser();

    if (!authenticated || !email) {
      return [];
    }

    return [
      {
        id: "export-my-data",
        label: "Export my data",
        icon: DownloadIcon,
        onClick: () => {
          collectExportData()
            .then((data) => {
              downloadAsJsonFile(data, getExportFilename());
              // The webhook notification is best-effort and must never fail
              // the export the user is actually waiting on.
              try {
                notifyExport(email);
              } catch {
                // Ignored; see comment above.
              }
              showStatusToast(EXPORT_DATA_TOAST_ID, "Data exported");
              // Clearing the legacy tasks table is cleanup, not part of the
              // export the user is waiting on — the download and webhook
              // above have already succeeded by this point, so a failure
              // here must not surface as an export failure (which would
              // wrongly invite the user to retry and re-download/re-notify).
              clearExportedTasks().catch(() => {
                // Ignored; the table is retried on the user's next export.
              });
            })
            .catch(() => {
              showErrorToast("Couldn't export your data. Please try again.", {
                toastId: EXPORT_DATA_TOAST_ID,
              });
            });
        },
      },
    ];
  };
}

export const useExportDataCmdItems = createUseExportDataCmdItems({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  notifyExport,
  getExportFilename,
});
