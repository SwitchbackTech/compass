import classNames from "classnames";
import { ShortcutSection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutSection";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";

interface ShortcutsSidebarProps {
  isOpen: boolean;
  sections: ShortcutOverlaySection[];
}

export const ShortcutsSidebar = ({
  isOpen,
  sections,
}: ShortcutsSidebarProps) => {
  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );

  if (!visibleSections.length) return null;

  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="Shortcuts sidebar"
      className={classNames(
        "fixed top-24 left-3 hidden flex-col xl:flex",
        "border-border-primary bg-bg-secondary",
        "w-[240px] rounded-lg border p-3 shadow-lg backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-4 opacity-0",
      )}
    >
      <div className="mb-2 font-medium text-text-lighter text-xs">
        Shortcuts
      </div>
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
