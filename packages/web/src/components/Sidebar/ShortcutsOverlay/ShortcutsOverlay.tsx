import { XIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { ShortcutSection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutSection";
import {
  selectIsShortcutsOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { type ShortcutOverlaySection } from "@web/shortcuts/shortcuts-overlay.types";

interface Props {
  sections: ShortcutOverlaySection[];
  viewLabel?: string;
}

const normalizeSearch = (text: string): string => text.toLowerCase().trim();

const matchesSearch = (searchTerm: string, text: string): boolean => {
  const normalized = normalizeSearch(text);
  const query = normalizeSearch(searchTerm);
  return normalized.includes(query);
};

export function ShortcutsOverlay({ sections, viewLabel }: Props) {
  const isOpen = useViewStore(selectIsShortcutsOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    // Auto-focus search input when overlay opens
    setTimeout(() => searchInputRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else {
          viewActions.closeShortcuts();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchQuery]);

  const filteredSections = sections
    .map((section) => {
      if (!searchQuery) {
        return section;
      }

      const filteredShortcuts = section.shortcuts.filter(
        (shortcut) =>
          matchesSearch(searchQuery, shortcut.label) ||
          shortcut.keys.some((key) => matchesSearch(searchQuery, key)),
      );

      return { ...section, shortcuts: filteredShortcuts };
    })
    .filter((section) => section.shortcuts.length > 0);

  const visibleSections =
    searchQuery.length > 0
      ? filteredSections
      : sections.filter((section) => section.shortcuts.length > 0);

  const subtitle = viewLabel
    ? `Keyboard shortcuts for ${viewLabel} view`
    : "Keyboard shortcuts";

  const hasResults = visibleSections.length > 0;

  if (!sections.filter((s) => s.shortcuts.length > 0).length) return null;

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
          "flex h-full flex-col bg-surface/95 px-4 pt-8 pb-5 text-text-muted shadow-2xl backdrop-blur-md",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-text text-xl">Shortcuts</div>
            <div className="mt-1 text-text-muted text-xs">{subtitle}</div>
          </div>

          <button
            aria-label="Close shortcuts"
            className="flex size-7 items-center justify-center rounded-default text-text-muted transition-colors hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={viewActions.closeShortcuts}
            tabIndex={isOpen ? 0 : -1}
            type="button"
          >
            <XIcon aria-hidden="true" size={15} />
          </button>
        </div>

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4 rounded-default bg-surface-panel px-3 py-2 text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          tabIndex={isOpen ? 0 : -1}
        />

        {hasResults ? (
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
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-text-muted text-sm">
              No shortcuts found
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
