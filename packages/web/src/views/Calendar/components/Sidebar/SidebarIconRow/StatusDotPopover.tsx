import type React from "react";
import { useState } from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { SpinnerIcon } from "@web/components/Icons/Spinner";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  /** The DotIcon trigger element */
  children: React.ReactNode;
  /** Hover tooltip shown before the user clicks */
  tooltip: string;
  /** Dialog title */
  title: string;
  /** Dialog body text */
  description: string;
  /** Label for the repair action button */
  repairLabel: string;
  /** Called when the user clicks the repair button */
  onRepair: () => void;
  /** When true: disables the repair button and shows a loading spinner */
  isRepairing: boolean;
}

export const StatusDotPopover = ({
  children,
  tooltip,
  title,
  description,
  repairLabel,
  onRepair,
  isRepairing,
}: Props) => {
  const [open, setOpen] = useState(false);
  const maxZIndex = useGridMaxZIndex();

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        <TooltipWrapper description={tooltip}>{children}</TooltipWrapper>
      </div>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: maxZIndex + ZIndex.LAYER_3,
              }}
              className="border-border-primary bg-bg-secondary/90 flex max-w-xs flex-col gap-3 rounded-lg border p-4 shadow-lg"
              aria-label={title}
              {...getFloatingProps()}
            >
              <h3 className="text-text-lighter m-0 text-sm font-semibold">
                {title}
              </h3>
              <p className="text-text-lighter m-0 text-sm">{description}</p>
              {isRepairing ? (
                <TooltipWrapper description="We're repairing your calendar">
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center justify-center rounded px-3 py-1.5 text-sm font-medium opacity-50"
                    type="button"
                  >
                    <SpinnerIcon aria-hidden="true" size={16} />
                  </button>
                </TooltipWrapper>
              ) : (
                <button
                  className="bg-bg-accent text-text-light hover:bg-bg-accent/80 self-start rounded px-3 py-1.5 text-sm font-medium"
                  onClick={onRepair}
                  type="button"
                >
                  {repairLabel}
                </button>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
