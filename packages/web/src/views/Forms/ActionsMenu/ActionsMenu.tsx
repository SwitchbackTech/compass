import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import type React from "react";
import {
  createContext,
  type MouseEvent,
  useContext,
  useRef,
  useState,
} from "react";
import {
  ID_EVENT_FORM_ACTION_MENU,
  Z_INDEX_FLOATING_MENU,
} from "@web/common/constants/web.constants";
import IconButton from "@web/components/IconButton/IconButton";

interface MenuContextValue {
  getItemProps: (
    userProps?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
  listRef: React.MutableRefObject<Array<HTMLElement | null>>;
  activeIndex: number | null;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export const useMenuContext = () => {
  const context = useContext(MenuContext);
  return context;
};

interface ActionsMenuProps {
  children: (closeMenu: () => void) => React.ReactNode;
  id?: string;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({ children, id }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const openedByMouseRef = useRef(false);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const menuId = id || ID_EVENT_FORM_ACTION_MENU;
  const triggerId = `${menuId}-trigger`;

  const { refs, context } = useFloating({
    open,
    onOpenChange: (open) => {
      setOpen(open);
      if (!open) {
        // Reset the flag when menu closes
        openedByMouseRef.current = false;
        setActiveIndex(null);
        // Clear the listRef when menu closes to start fresh next time
        listRef.current = [];
      }
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });

  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    focusItemOnHover: false,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNavigation],
  );

  const closeMenu = () => {
    setOpen(false);
    // Return focus to trigger when menu closes
    const triggerElement = document.getElementById(triggerId);
    if (triggerElement) {
      triggerElement.focus();
    }
  };

  return (
    <>
      {/* floating-ui's reference element only needs a DOM node to anchor
      position tracking to; the interactive/ARIA props below go on the
      button itself so a plain div doesn't end up with button-only
      attributes like aria-expanded. */}
      <div className="inline-flex" ref={refs.setReference}>
        <IconButton
          {...getReferenceProps({
            onClick: (e: MouseEvent<HTMLButtonElement>) => {
              // Prevent default behaviour (like focusing inputs) and stop bubbling to parent form
              e.preventDefault();
              e.stopPropagation();
              // Only set the flag for actual mouse clicks (detail > 0 indicates mouse click)
              openedByMouseRef.current = e.detail > 0;
            },
          })}
          id={triggerId}
          aria-label="Open actions menu"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
        >
          <DotsThreeVerticalIcon />
        </IconButton>
      </div>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={openedByMouseRef.current ? -1 : 0}
            returnFocus={false}
          >
            <div
              className="flex flex-col gap-1 rounded-sm border border-border bg-surface-raised p-1 shadow-[0_8px_24px_var(--color-shadow-default)]"
              ref={refs.setFloating}
              style={{
                ...context.floatingStyles,
                zIndex: Z_INDEX_FLOATING_MENU,
              }}
              {...getFloatingProps()}
              id={menuId}
              role="menu"
              aria-labelledby={triggerId}
            >
              <MenuContext.Provider
                value={{
                  getItemProps,
                  listRef,
                  activeIndex,
                }}
              >
                {children(closeMenu)}
              </MenuContext.Provider>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
