import { DownloadIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { EXPORT_MY_DATA_TOAST_ID } from "@web/common/constants/toast.constants";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

type ExportDataDependencies = {
  runExportMyData: typeof runExportMyData;
};

/**
 * Returns a command palette item that downloads the user's local IndexedDB
 * data (recoverable tasks + non-demo events) as a JSON file, notifies Tyler
 * via webhook so someday events can be pulled from Mongo by hand, then
 * clears the retained tasks table. Signed-in only: the webhook exists to
 * locate a user's someday events, which only signed-in users have.
 */
export function createUseExportDataCmdItems({
  runExportMyData,
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
          runExportMyData(email)
            .then(() => {
              showStatusToast(EXPORT_MY_DATA_TOAST_ID, "Data exported");
            })
            .catch(() => {
              showErrorToast("Couldn't export your data. Please try again.", {
                toastId: EXPORT_MY_DATA_TOAST_ID,
              });
            });
        },
      },
    ];
  };
}

export const useExportDataCmdItems = createUseExportDataCmdItems({
  runExportMyData,
});
