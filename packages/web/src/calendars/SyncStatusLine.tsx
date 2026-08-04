import { type FC } from "react";
import {
  SYNC_STATUS_VARIANT_CLASSNAME,
  type SyncStatus,
} from "./sync-status.types";

interface SyncStatusLineProps {
  status: SyncStatus;
  /** Extra classes (e.g. spacing) layered onto the shared status styling. */
  className?: string;
}

/**
 * One account's live sync status line - shared by the sidebar's single- and
 * per-account headers and the manage-accounts dialog, so the surfaces a user
 * directly compares cannot drift. Renders nothing when there's no status to
 * show (e.g. NOT_CONNECTED).
 */
export const SyncStatusLine: FC<SyncStatusLineProps> = ({
  status,
  className,
}) => {
  if (!status) return null;

  return (
    <p
      aria-live="polite"
      className={`text-xs ${SYNC_STATUS_VARIANT_CLASSNAME[status.variant]} ${className ?? ""}`}
      role="status"
    >
      {status.text}
    </p>
  );
};
