import React, {
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
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
  useRole,
} from "@floating-ui/react";
// @ts-expect-error - Icon name might not be present in type definitions but does exist at runtime
import { DotsThreeVertical } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";

interface ActionsMenuProps {
  children: (closeMenu: () => void) => React.ReactNode;
  id?: string;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({ children, id }) => {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const openedByMouseRef = useRef(false);
  const menuItemsRef = useRef<HTMLElement[]>([]);

  const menuId = id || "event-actions-menu";
  const triggerId = `${menuId}-trigger`;

  const { x, y, refs, strategy, context } = useFloating({
    open,
    onOpenChange: (open) => {
      setOpen(open);
      if (!open) {
        // Reset the flag when menu closes
        openedByMouseRef.current = false;
        setFocusedIndex(-1);
        menuItemsRef.current = [];
      }
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: "bottom-end",
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const closeMenu = () => {
    setOpen(false);
    // Return focus to trigger when menu closes
    const triggerElement = document.getElementById(triggerId);
    if (triggerElement) {
      triggerElement.focus();
    }
  };

  // Update focused index when menu items change
  useEffect(() => {
    if (open) {
      const menuItems = Array.from(
        document.querySelectorAll(`#${menuId} [role="menuitem"]`),
      ) as HTMLElement[];
      menuItemsRef.current = menuItems;

      // Focus first item if opened by keyboard
      if (!openedByMouseRef.current && menuItems.length > 0) {
        setFocusedIndex(0);
        menuItems[0].focus();
      }
    }
  }, [open, menuId]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open || menuItemsRef.current.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIndex =
          focusedIndex < menuItemsRef.current.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(nextIndex);
        menuItemsRef.current[nextIndex]?.focus();
        break;

      case "ArrowUp":
        e.preventDefault();
        const prevIndex =
          focusedIndex > 0 ? focusedIndex - 1 : menuItemsRef.current.length - 1;
        setFocusedIndex(prevIndex);
        menuItemsRef.current[prevIndex]?.focus();
        break;

      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        menuItemsRef.current[0]?.focus();
        break;

      case "End":
        e.preventDefault();
        const lastIndex = menuItemsRef.current.length - 1;
        setFocusedIndex(lastIndex);
        menuItemsRef.current[lastIndex]?.focus();
        break;

      case "Escape":
        e.preventDefault();
        closeMenu();
        break;

      case "Tab":
        // Allow natural tab behavior, but close menu
        closeMenu();
        break;
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
          >
            <StyledMenu
              ref={refs.setFloating}
              style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
              {...getFloatingProps()}
              id={menuId}
              role="menu"
              aria-labelledby={triggerId}
              onKeyDown={handleKeyDown}
            >
              {children(closeMenu)}
            </StyledMenu>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

const TriggerWrapper = styled.div`
  display: inline-flex;
`;

const StyledMenu = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: ${({ theme }) => theme.color.menu.bg};
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  padding: 8px;
  border-radius: ${({ theme }) => theme.shape.borderRadius || "6px"};
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 3;
`;
