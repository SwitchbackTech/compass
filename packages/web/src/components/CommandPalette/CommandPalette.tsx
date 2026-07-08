import {
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { moreCommandPaletteItems } from "@web/common/constants/more.cmd.constants";
import { getNavigationCommandItems } from "@web/common/constants/navigation.cmd.constants";
import {
  VIEW_SHORTCUTS,
  type ViewName,
} from "@web/common/constants/shortcuts.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAuthCmdItems } from "@web/common/hooks/useAuthCmdItems";
import { useGoogleCmdItems } from "@web/common/hooks/useGoogleCmdItems";
import { useLogoutCmdItems } from "@web/common/hooks/useLogoutCmdItems";
import { useSubscribeCmdItems } from "@web/common/hooks/useSubscribeCmdItems";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  selectIsCmdPaletteOpen,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";
import { type CommandItem, type CommandSection } from "./command-palette.types";

interface CommandPaletteProps {
  currentView: ViewName;
  today: Dayjs;
  onGoToToday: () => void;
  onShowShortcuts: () => void;
  commonTasks: CommandItem[];
  placeholder: string;
}

/**
 * Case-insensitive substring filter on each item's label. Sections with no
 * surviving items are dropped so their heading disappears too.
 */
export function filterSections(
  sections: CommandSection[],
  search: string,
): CommandSection[] {
  const query = search.trim().toLowerCase();
  if (!query) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.label.toLowerCase().includes(query),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export const CommandPalette = ({
  currentView,
  today,
  onGoToToday,
  onShowShortcuts,
  commonTasks,
  placeholder,
}: CommandPaletteProps) => {
  const open = useSettingsStore(selectIsCmdPaletteOpen);
  const navigate = useNavigate();
  const googleCmdItems = useGoogleCmdItems();
  const subscribeCmdItems = useSubscribeCmdItems();
  const authCmdItems = useAuthCmdItems();
  const logoutCmdItems = useLogoutCmdItems();

  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  // Focus the search input the moment it mounts (commit phase, like the
  // autoFocus attribute — but without tripping the a11y lint). Stable identity
  // keeps it from re-firing on every keystroke re-render.
  const focusInputOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  const close = () => settingsActions.closeCmdPalette();

  const { refs, context } = useFloating({
    open: true,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) close();
    },
  });

  const sections: CommandSection[] = [
    {
      id: "navigation",
      heading: "Navigation",
      items: getNavigationCommandItems({
        currentView,
        onGoToToday,
        onNavigateToView: (viewName) =>
          navigate({ to: VIEW_SHORTCUTS[viewName].route }),
        onShowShortcuts,
        today,
      }),
    },
    { id: "general", heading: "Common Tasks", items: commonTasks },
    {
      id: "settings",
      heading: "Settings",
      items: [
        ...googleCmdItems,
        ...subscribeCmdItems,
        ...authCmdItems,
        ...logoutCmdItems,
      ],
    },
    ...moreCommandPaletteItems,
  ];

  const filteredSections = filterSections(sections, search);
  const flatItems = filteredSections.flatMap((section) => section.items);
  const disabledIndices = flatItems.reduce<number[]>((acc, item, index) => {
    if (item.disabled) acc.push(index);
    return acc;
  }, []);

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
    disabledIndices,
  });
  const { getReferenceProps, getItemProps } = useInteractions([
    dismiss,
    role,
    listNav,
  ]);

  if (!open) return null;

  let itemIndex = -1;

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        className="flex justify-center bg-bg-primary/85 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX_MODAL }}
      >
        {/* No FloatingFocusManager: virtual list navigation keeps real focus in
            the search input, so a focus trap would only fight it. We focus the
            input on open via the focusInputOnMount callback ref above. */}
        <div
          ref={refs.setFloating}
          className="mt-[15vh] h-fit w-[640px] max-w-[90vw] overflow-hidden rounded-xl border border-border-primary bg-bg-secondary shadow-[0_16px_48px_var(--color-shadow-default)]"
        >
          <input
            {...getReferenceProps({
              onKeyDown(event) {
                if (event.key === "Enter" && activeIndex != null) {
                  event.preventDefault();
                  listRef.current[activeIndex]?.click();
                }
              },
            })}
            ref={focusInputOnMount}
            type="text"
            value={search}
            placeholder={placeholder}
            aria-label="Command palette search"
            className="w-full border-b border-border-primary bg-transparent px-4 py-3 text-text-light outline-none placeholder:text-text-lighter"
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
            }}
          />

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {filteredSections.length === 0 ? (
              <div className="px-3 py-2 text-text-lighter">
                No results for “{search}”
              </div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.id} className="mb-1">
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-lighter">
                    {section.heading}
                  </div>
                  {section.items.map((item) => {
                    itemIndex += 1;
                    const index = itemIndex;
                    const isActive = activeIndex === index;
                    const rowClassName = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-text-light ${
                      isActive ? "bg-panel-badge-bg" : ""
                    } ${item.disabled ? "cursor-default opacity-50" : ""}`;

                    const commonProps = getItemProps({
                      ref(node: HTMLElement | null) {
                        listRef.current[index] = node;
                      },
                      onClick(event) {
                        if (item.disabled) return;
                        // Pass the real event so handlers keyed off the
                        // clicked row (Week's onEventTargetVisibility) work.
                        item.onClick?.(event);
                        close();
                      },
                    });

                    const content = (
                      <>
                        <item.icon size={18} />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.shortcut && (
                          <ShortcutKeys
                            className="ml-auto shrink-0"
                            keys={item.shortcut}
                          />
                        )}
                      </>
                    );

                    if (item.href) {
                      return (
                        <a
                          key={item.id}
                          {...commonProps}
                          role="option"
                          aria-selected={isActive}
                          href={item.href}
                          target={item.target}
                          rel="noopener noreferrer"
                          className={rowClassName}
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        {...commonProps}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        disabled={item.disabled}
                        className={rowClassName}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </FloatingOverlay>
    </FloatingPortal>
  );
};
