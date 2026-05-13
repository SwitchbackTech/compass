import { type Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutList } from "../ShortcutList";

export const ShortcutSection = ({
  isFirst = false,
  title,
  shortcuts,
}: {
  isFirst?: boolean;
  title: string;
  shortcuts: Shortcut[];
}) => {
  if (!shortcuts.length) return null;
  return (
    <section
      className={
        isFirst
          ? "mb-5 last:mb-0"
          : "mt-5 mb-5 border-border-primary/70 border-t pt-4 last:mb-0"
      }
    >
      <div className="mb-2 font-semibold text-[11px] text-accent-primary uppercase tracking-wide">
        {title}
      </div>
      <ShortcutList shortcuts={shortcuts} />
    </section>
  );
};
