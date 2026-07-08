import { EVENT_DELETED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/**
 * "Deleted" status toast for event deletes. Shows a Mod+Z keycap hint when the
 * delete was recorded in undo history; recurring deletes aren't undoable, so
 * hinting Cmd+Z there would undo an unrelated earlier change.
 */
export function showDeletedToast(withUndoHint: boolean): void {
  showStatusToast(
    EVENT_DELETED_TOAST_ID,
    withUndoHint ? (
      <span className="inline-flex items-center gap-2">
        Deleted
        <ShortcutKeys keys={["Mod", "Z"]} title="Undo" />
      </span>
    ) : (
      "Deleted"
    ),
  );
}
