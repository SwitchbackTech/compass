import classNames from "classnames";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { type Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutSection } from "./ShortcutSection";

export interface ShortcutOverlaySection {
  id?: string;
  title: string;
  shortcuts: Shortcut[];
}

interface ShortcutsOverlayProps {
  sections: ShortcutOverlaySection[];
  heading?: string;
  ariaLabel?: string;
  className?: string;
}

export const ShortcutsOverlay = ({
  sections,
  heading = "Shortcuts",
  ariaLabel = "Shortcut overlay",
  className = "",
}: ShortcutsOverlayProps) => {
  const maxZIndex = useGridMaxZIndex();

  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );

  if (!visibleSections.length) return null;

  return (
    <aside
      aria-label={ariaLabel}
      className={classNames(
        "fixed top-24 left-3 border-border-primary bg-bg-secondary",
        "border p-3 shadow-lg backdrop-blur-sm md:block",
        `hidden w-60 rounded-lg ${className}`,
      )}
      style={{ zIndex: maxZIndex }}
    >
      {heading && (
        <div className="mb-2 font-medium text-text-lighter text-xs">
          {heading}
        </div>
      )}
      {visibleSections.map((section, index) => (
        <ShortcutSection
          key={section.id ?? section.title}
          isFirst={index === 0}
          title={section.title}
          shortcuts={section.shortcuts}
        />
      ))}
    </aside>
  );
};
