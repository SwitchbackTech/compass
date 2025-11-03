import { Shortcut } from "../types/shortcut.types";
import { ShortcutList } from "./ShortcutList";

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
      <div className="mb-1 text-[10px] tracking-wide text-white/50 uppercase">
        {title}
      </div>
      <ShortcutList shortcuts={shortcuts} />
    </div>
  );
};
