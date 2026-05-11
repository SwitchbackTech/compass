import { XIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { ShortcutSection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutSection";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sections: ShortcutOverlaySection[];
}

export function ShortcutsOverlay({ isOpen, onClose, sections }: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );

  return (
    <div
      aria-label="Keyboard shortcuts"
      className="absolute inset-0 z-20 flex flex-col bg-bg-secondary/95 px-6 pt-8 pb-5 text-text-light shadow-2xl backdrop-blur-md"
      role="dialog"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-medium text-text-lighter text-xl">Shortcuts</div>
          <div className="mt-1 text-text-light-inactive text-xs">
            Current view commands
          </div>
        </div>

        <button
          aria-label="Close shortcuts"
          className="flex size-8 items-center justify-center rounded-default border border-border-primary bg-panel-bg text-text-light transition hover:border-accent-primary hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          onClick={onClose}
          type="button"
        >
          <XIcon aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="overflow-y-auto">
        {visibleSections.map((section) => (
          <ShortcutSection
            key={section.id ?? section.title}
            title={section.title}
            shortcuts={section.shortcuts}
          />
        ))}
      </div>
    </div>
  );
}
