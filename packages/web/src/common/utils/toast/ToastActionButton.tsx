import { type ReactNode } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

export const TOAST_PRIMARY_ACTION_KEY = "1";

export function ToastActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
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
