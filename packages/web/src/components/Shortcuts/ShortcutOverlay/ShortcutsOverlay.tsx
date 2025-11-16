import { Shortcut } from "@web/common/types/global.shortcut.types";
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
  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );

  if (!visibleSections.length) return null;

  return (
    <aside
      aria-label={ariaLabel}
      className={`bg-bg-secondary border-border-primary fixed top-24 left-3 z-30 hidden w-[240px] rounded-lg border p-3 shadow-lg backdrop-blur-sm md:block ${className}`}
    >
      {heading && (
        <div className="text-text-lighter mb-2 text-xs font-medium">
          {heading}
        </div>
      )}
      {visibleSections.map((section) => (
        <ShortcutSection
          key={section.id ?? section.title}
          title={section.title}
          shortcuts={section.shortcuts}
        />
      ))}
    </aside>
  );
};
