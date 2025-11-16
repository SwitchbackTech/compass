import { Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutList } from "../ShortcutList";

export const ShortcutSection = ({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: Shortcut[];
}) => {
  if (!shortcuts.length) return null;
  return (
    <div className="mb-3">
      <div className="text-text-light mb-1 text-[10px] tracking-wide uppercase">
        {title}
      </div>
      <ShortcutList shortcuts={shortcuts} />
    </div>
  );
};
