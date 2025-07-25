import React, { MouseEvent, useRef, useState } from "react";
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
  const openedByMouseRef = useRef(false);

  const { x, y, refs, strategy, context } = useFloating({
    open,
    onOpenChange: (open) => {
      setOpen(open);
      if (!open) {
        // Reset the flag when menu closes
        openedByMouseRef.current = false;
      }
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: "bottom-end",
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const closeMenu = () => {};

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
        <IconButton id="actions-menu-trigger" aria-label="Open actions menu">
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
              id={id}
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
