import { XIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect } from "react";
import { ShortcutSection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutSection";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sections: ShortcutOverlaySection[];
  viewLabel?: string;
}

export function ShortcutsOverlay({
  isOpen,
  onClose,
  sections,
  viewLabel,
}: Props) {
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

  const visibleSections = sections.filter(
    (section) => section.shortcuts.length > 0,
  );
  const subtitle = viewLabel
    ? `Keyboard shortcuts for ${viewLabel} view`
    : "Keyboard shortcuts";

  if (!visibleSections.length) return null;

  return (
    <div
      aria-hidden={!isOpen}
      aria-label="Keyboard shortcuts"
      className={classNames(
        "absolute inset-0 z-20 overflow-hidden",
        isOpen ? "" : "pointer-events-none",
      )}
      role="dialog"
    >
      <div
        className={classNames(
          "flex h-full flex-col bg-bg-secondary/95 px-4 pt-8 pb-5 text-text-light shadow-2xl backdrop-blur-md",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="font-medium text-text-lighter text-xl">
              Shortcuts
            </div>
            <div className="mt-1 text-text-light-inactive text-xs">
              {subtitle}
            </div>
          </div>

          <button
            aria-label="Close shortcuts"
            className="flex size-7 items-center justify-center rounded-default text-text-light-inactive transition-colors hover:bg-panel-bg hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
            type="button"
          >
            <XIcon aria-hidden="true" size={15} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {visibleSections.map((section, index) => (
            <ShortcutSection
              key={section.id ?? section.title}
              isFirst={index === 0}
              title={section.title}
              shortcuts={section.shortcuts}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
