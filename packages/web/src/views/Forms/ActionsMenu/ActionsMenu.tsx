import React, {
  MouseEvent,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
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
// @ts-expect-error - Icon name might not be present in type definitions but does exist at runtime
import { DotsThreeVertical } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";
import { StyledMenu, TriggerWrapper } from "./styled";

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
  bgColor: string;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  children,
  id,
  bgColor,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const openedByMouseRef = useRef(false);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const menuId = id || "event-actions-menu";
  const triggerId = `${menuId}-trigger`;

  const { x, y, refs, strategy, context } = useFloating({
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
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  // Create a dense array for FloatingUI and mapping back to sparse array
  const denseListRef = useRef<Array<HTMLElement>>([]);
  const sparseToCompactMap = useRef<Map<number, number>>(new Map());
  const compactToSparseMap = useRef<Map<number, number>>(new Map());

  // Update dense list and mappings when listRef changes
  useEffect(() => {
    const denseArray: HTMLElement[] = [];
    sparseToCompactMap.current.clear();
    compactToSparseMap.current.clear();

    listRef.current.forEach((item, sparseIndex) => {
      if (item !== null) {
        const compactIndex = denseArray.length;
        denseArray.push(item);
        sparseToCompactMap.current.set(sparseIndex, compactIndex);
        compactToSparseMap.current.set(compactIndex, sparseIndex);
      }
    });

    denseListRef.current = denseArray;
  });

  // Convert sparse activeIndex to compact activeIndex for FloatingUI
  const compactActiveIndex =
    activeIndex !== null
      ? (sparseToCompactMap.current.get(activeIndex) ?? null)
      : null;

  const listNavigation = useListNavigation(context, {
    listRef: denseListRef,
    activeIndex: compactActiveIndex,
    onNavigate: (compactIndex) => {
      const sparseIndex = compactToSparseMap.current.get(compactIndex) ?? null;
      if (sparseIndex !== null) {
        setActiveIndex(sparseIndex);
      }
    },
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
      <TriggerWrapper
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: (e: MouseEvent<HTMLDivElement>) => {
            // Prevent default behaviour (like focusing inputs) and stop bubbling to parent form
            e.preventDefault();
            e.stopPropagation();
            // Only set the flag for actual mouse clicks (detail > 0 indicates mouse click)
            openedByMouseRef.current = e.detail > 0;
          },
        })}
      >
        <IconButton
          id={triggerId}
          aria-label="Open actions menu"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
        >
          <DotsThreeVertical />
        </IconButton>
      </TriggerWrapper>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={openedByMouseRef.current ? -1 : 0}
            returnFocus={false}
          >
            <StyledMenu
              ref={refs.setFloating}
              style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
              {...getFloatingProps()}
              id={menuId}
              role="menu"
              aria-labelledby={triggerId}
              bgColor={bgColor}
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
            </StyledMenu>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
