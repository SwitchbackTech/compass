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
  useRole,
} from "@floating-ui/react";
import { SpinnerIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ZIndex } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { TooltipWrapper } from "../Tooltip/TooltipWrapper";

interface StatusDotPopoverProps {
  children: React.ReactNode;
  tooltip: string;
  title: string;
  description: string;
  repairLabel: string;
  onRepair: () => void;
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
}: StatusDotPopoverProps) => {
  const [open, setOpen] = useState(false);
  const maxZIndex = useGridMaxZIndex();

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom",
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

  const displayTitle = isRepairing ? "Repairing your calendar…" : title;

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
              aria-label={displayTitle}
              {...getFloatingProps()}
            >
              <h3 className="text-text-lighter m-0 text-sm font-semibold">
                {displayTitle}
              </h3>
              {!isRepairing && (
                <p className="text-text-lighter m-0 text-sm">{description}</p>
              )}
              {isRepairing ? (
                <button
                  disabled
                  className="flex cursor-not-allowed items-center justify-center self-start rounded px-3 py-1.5 opacity-50"
                  type="button"
                >
                  <SpinnerIcon aria-hidden="true" size={16} />
                </button>
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
