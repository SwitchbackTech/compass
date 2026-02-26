import classNames from "classnames";
import React, {
  DetailedHTMLProps,
  HTMLAttributes,
  createElement,
  forwardRef,
} from "react";
import {
  FloatingContext,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";

interface BaseContextMenuProps {
  onOutsideClick: () => void;
  context: FloatingContext;
  children: React.ReactNode;
}

type Props = DetailedHTMLProps<
  BaseContextMenuProps & HTMLAttributes<HTMLUListElement>,
  HTMLUListElement
>;

export const BaseContextMenu = forwardRef<HTMLUListElement, Props>(
  ({ onOutsideClick, context, ...props }, ref) => {
    const dismiss = useDismiss(context, {
      outsidePress: (event) => {
        event.preventDefault(); // Prevents clicking another UI element when dismissing
        onOutsideClick();
        return true;
      },
    });

    const click = useClick(context, { enabled: true });

    const role = useRole(context, { role: "menu" });

    const { getFloatingProps } = useInteractions([dismiss, click, role]);

    return createElement("ul", {
      ...getFloatingProps(props),
      className: classNames(
        "bg-bg-secondary absolute min-w-[160px] list-none rounded",
        "border border-gray-600 shadow-md",
      ),
      style: {
        ...props.style,
        zIndex: ZIndex.LAYER_5,
      },
      ref,
    });
  },
);

BaseContextMenu.displayName = "BaseContextMenu";
