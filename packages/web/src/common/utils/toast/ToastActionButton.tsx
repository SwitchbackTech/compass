import { type ReactNode } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  NOTICE_PRIMARY_ACTION_KEY,
  useNoticeActionShortcut,
} from "@web/shortcuts/notice-focus/useNoticeActionShortcut";

export const TOAST_PRIMARY_ACTION_KEY = NOTICE_PRIMARY_ACTION_KEY;

export function ToastActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  useNoticeActionShortcut(TOAST_PRIMARY_ACTION_KEY, onClick);

  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded bg-accent-secondary px-3 py-2 font-medium text-on-accent text-sm transition-colors hover:bg-accent-secondary-hover"
      onClick={onClick}
      type="button"
    >
      {children}
      <ShortcutKeys keys={TOAST_PRIMARY_ACTION_KEY} />
    </button>
  );
}
