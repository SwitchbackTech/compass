import { type PropsWithChildren } from "react";
import { useCollapsiblePanel } from "@web/common/hooks/useCollapsiblePanel";

interface Props extends PropsWithChildren {
  isOpen: boolean;
  /** Rendered width when expanded, in px. */
  width: number;
}

/**
 * Width-collapsing wrapper: mounts/unmounts its children through a subtle
 * width transition (see useCollapsiblePanel). Children should render at
 * their natural fixed width; the wrapper clips them during the slide.
 */
export function CollapsiblePanel({ children, isOpen, width }: Props) {
  const { isExpanded, isMounted, onTransitionEnd } =
    useCollapsiblePanel(isOpen);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className="h-full min-w-0 shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none"
      onTransitionEnd={onTransitionEnd}
      style={{ width: isExpanded ? width : 0 }}
    >
      {children}
    </div>
  );
}
