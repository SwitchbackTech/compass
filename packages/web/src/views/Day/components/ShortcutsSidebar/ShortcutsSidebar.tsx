import classNames from "classnames";
import { useEffect, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );

  if (!visibleSections.length) return null;

  if (!isOpen && !isVisible) return null;

  return (
    <aside
      aria-label="Shortcuts sidebar"
      className={classNames(
        "fixed top-24 left-3 hidden flex-col md:flex",
        "bg-bg-secondary border-border-primary",
        "w-[240px] rounded-lg border p-3 shadow-lg backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
      )}
    >
      <div className="text-text-lighter mb-2 text-xs font-medium">
        Shortcuts
      </div>
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
