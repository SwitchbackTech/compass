import { type Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutList } from "../ShortcutList";

export const ShortcutSection = ({
  isFirst,
  title,
  shortcuts,
}: {
  isFirst: boolean;
  title: string;
  shortcuts: Shortcut[];
}) => {
  if (!shortcuts.length) return null;
  return (
    <section
      className={
        isFirst
          ? "mb-6 last:mb-0"
          : "mt-6 mb-6 border-border-primary/60 border-t pt-5 last:mb-0"
      }
    >
      <div className="mb-3 font-bold text-sm text-text-lighter leading-tight">
        {title}
      </div>
      <ShortcutList shortcuts={shortcuts} />
    </section>
  );
};
