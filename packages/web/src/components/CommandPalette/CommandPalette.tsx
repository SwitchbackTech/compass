import {
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { type SyncStatusVariant } from "@web/calendars/sync-status.types";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { eventCommandPaletteItems } from "@web/components/CommandPalette/event.cmd.constants";
import { useAuthCmdItems } from "@web/components/CommandPalette/hooks/useAuthCmdItems";
import { useCalendarSyncCmdItems } from "@web/components/CommandPalette/hooks/useCalendarSyncCmdItems";
import { useDeleteAccountCmdItems } from "@web/components/CommandPalette/hooks/useDeleteAccountCmdItems";
import { useDemoEventsCmdItems } from "@web/components/CommandPalette/hooks/useDemoEventsCmdItems";
import { useExportDataCmdItems } from "@web/components/CommandPalette/hooks/useExportDataCmdItems";
import { useLogoutCmdItems } from "@web/components/CommandPalette/hooks/useLogoutCmdItems";
import { useSubscribeCmdItems } from "@web/components/CommandPalette/hooks/useSubscribeCmdItems";
import { useThemeCmdItems } from "@web/components/CommandPalette/hooks/useThemeCmdItems";
import { getMoreCommandPaletteSections } from "@web/components/CommandPalette/more.cmd.constants";
import {
  getNavigationCommandItems,
  getNavigationViewRoute,
} from "@web/components/CommandPalette/navigation.cmd.constants";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { type EventMutationDependencies } from "@web/events/mutations/useEventMutations";
import { useUndoRedo } from "@web/events/mutations/useUndoRedo";
import {
  selectIsCmdPaletteOpen,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";
import { type CommandSection } from "./command-palette.types";

const SYNC_STATUS_VARIANT_CLASSNAME: Record<SyncStatusVariant, string> = {
  syncing: "c-sync-text-wave",
  healthy: "text-text",
  warning: "text-warning",
  error: "text-error",
};

interface CommandPaletteProps {
  currentView: ViewName;
  onGoToToday: () => void;
  onShowShortcuts: () => void;
  onShowWelcomeGuide?: () => void;
  placeholder: string;
  mutationDependencies?: EventMutationDependencies;
}

interface CommandPaletteContentProps {
  placeholder: string;
  sections: CommandSection[];
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

/** Mounted only while open so search/activeIndex reset on every reopen. */
const CommandPaletteContent = ({
  placeholder,
  sections,
}: CommandPaletteContentProps) => {
  const { syncStatus } = useCalendarSyncCmdItems();

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

  let itemIndex = -1;

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        className="flex justify-center bg-background/85 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX_MODAL }}
      >
        {/* No FloatingFocusManager: virtual list navigation keeps real focus in
            the search input, so a focus trap would only fight it. We focus the
            input on open via the focusInputOnMount callback ref above. */}
        <div
          ref={refs.setFloating}
          className="mt-[15vh] h-fit w-[640px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_48px_var(--color-shadow-default)]"
        >
          {syncStatus ? (
            <div
              role="status"
              className={`px-4 pt-3 text-xs ${SYNC_STATUS_VARIANT_CLASSNAME[syncStatus.variant]}`}
            >
              {syncStatus.text}
            </div>
          ) : null}
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
            className="w-full border-border border-b bg-transparent px-4 py-3 text-text outline-none placeholder:text-text-muted focus-visible:border-accent"
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
            }}
          />

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {filteredSections.length === 0 ? (
              <div className="px-3 py-2 text-text">
                No results for “{search}”
              </div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.id} className="mb-1">
                  <div className="px-3 pt-2 pb-1 font-semibold text-text text-xs uppercase tracking-wide">
                    {section.heading}
                  </div>
                  {section.items.map((item) => {
                    itemIndex += 1;
                    const index = itemIndex;
                    const isActive = activeIndex === index;
                    const rowClassName = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-text-muted ${
                      isActive
                        ? "bg-surface-overlay ring-1 ring-accent ring-inset"
                        : ""
                    } ${item.disabled ? "cursor-default opacity-50" : ""}`;

                    const content = (
                      <>
                        <item.icon size={18} className={item.iconClassName} />
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

                    return (
                      <button
                        key={item.id}
                        {...getItemProps({
                          ref(node: HTMLElement | null) {
                            listRef.current[index] = node;
                          },
                          onClick() {
                            if (item.disabled) return;
                            item.onClick?.();
                            if (!item.keepOpen) close();
                          },
                        })}
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

export const CommandPalette = ({
  currentView,
  onGoToToday,
  onShowShortcuts,
  onShowWelcomeGuide,
  placeholder,
  mutationDependencies,
}: CommandPaletteProps) => {
  const open = useSettingsStore(selectIsCmdPaletteOpen);
  useAppLockReason("commandPalette", open);
  const navigate = useNavigate();
  const { items: calendarCmdItems } = useCalendarSyncCmdItems();
  const subscribeCmdItems = useSubscribeCmdItems(open);
  const exportDataCmdItems = useExportDataCmdItems();
  const demoEventsCmdItems = useDemoEventsCmdItems();
  const authCmdItems = useAuthCmdItems();
  const logoutCmdItems = useLogoutCmdItems();
  const deleteAccountCmdItems = useDeleteAccountCmdItems();
  const themeCmdItems = useThemeCmdItems();
  const { undo, canUndo } = useUndoRedo(mutationDependencies);

  const sections: CommandSection[] = [
    {
      id: "navigation",
      heading: "Navigation",
      items: getNavigationCommandItems({
        currentView,
        onGoToToday,
        onNavigateToView: (viewName) =>
          navigate({ to: getNavigationViewRoute(viewName) }),
        onShowShortcuts,
        onShowWelcomeGuide,
      }),
    },
    {
      id: "general",
      heading: "Common Actions",
      items: [
        ...eventCommandPaletteItems,
        ...demoEventsCmdItems,
        {
          id: "undo-last-change",
          label: "Undo last change",
          icon: ArrowCounterClockwiseIcon,
          shortcut: ["Mod", "Z"],
          disabled: !canUndo,
          // Defer so the palette unmounts before undo's refocusEventElement
          // starts hunting for the restored event element.
          onClick: () => queueMicrotask(undo),
        },
      ],
    },
    {
      id: "appearance",
      heading: "Appearance",
      items: themeCmdItems,
    },
    {
      id: "settings",
      heading: "Settings",
      items: [
        ...calendarCmdItems,
        ...subscribeCmdItems,
        ...exportDataCmdItems,
        ...authCmdItems,
        ...logoutCmdItems,
        ...deleteAccountCmdItems,
      ],
    },
    ...getMoreCommandPaletteSections(currentView),
  ];

  if (!open) return null;

  return (
    <CommandPaletteContent placeholder={placeholder} sections={sections} />
  );
};

export const LifeCommandPalette = ({
  placeholder,
}: {
  placeholder: string;
}) => {
  const open = useSettingsStore(selectIsCmdPaletteOpen);
  useAppLockReason("commandPalette", open);
  const navigate = useNavigate();
  const themeCmdItems = useThemeCmdItems();

  if (!open) return null;

  return (
    <CommandPaletteContent
      placeholder={placeholder}
      sections={[
        {
          id: "navigation",
          heading: "Navigation",
          items: getNavigationCommandItems({
            currentView: "life",
            onNavigateToView: (viewName) =>
              navigate({ to: getNavigationViewRoute(viewName) }),
          }),
        },
        {
          id: "appearance",
          heading: "Appearance",
          items: themeCmdItems,
        },
        ...getMoreCommandPaletteSections("life"),
      ]}
    />
  );
};
