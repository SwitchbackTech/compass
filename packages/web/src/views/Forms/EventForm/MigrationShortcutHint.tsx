import { type ReactNode } from "react";
import { getMetaKeyIcon } from "@web/common/utils/shortcut/shortcut.util";

export const MigrationShortcutHint = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span>CTRL</span> + {getMetaKeyIcon({ size: 14 })} + {children}
    </span>
  );
};
