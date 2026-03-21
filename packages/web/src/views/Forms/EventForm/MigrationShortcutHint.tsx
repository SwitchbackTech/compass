import { type ReactNode } from "react";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";

export const MigrationShortcutHint = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <span className="flex items-center gap-1 text-sm">
      {getModifierKeyIcon({ size: 14 })} + {children}
    </span>
  );
};
