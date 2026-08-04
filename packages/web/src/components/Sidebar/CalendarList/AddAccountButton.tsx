import { PlusIcon } from "@phosphor-icons/react";
import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

/**
 * Hover-revealed affordance on an account heading for connecting another
 * Google account - alongside the command palette's "Add/remove accounts",
 * this is the sidebar's only entry point for adding an account, so it never
 * needs its own permanent row. Only offered once a first account is already
 * healthy; before that the header's own Connect button covers it. Expects a
 * `group/header` ancestor to control its hover reveal.
 */
export const AddAccountButton: FC = () => {
  const { connect, isAvailable, isConnecting, state } = useConnectGoogle();

  if (!isAvailable || (state !== "HEALTHY" && state !== "IMPORTING")) {
    return null;
  }

  return (
    <TooltipWrapper
      description="Add account"
      disabled={isConnecting}
      onClick={connect}
    >
      <button
        aria-busy={isConnecting || undefined}
        aria-label="Add account"
        className="c-focus-ring shrink-0 rounded p-0.5 text-text-muted opacity-0 hover:bg-surface-panel focus-visible:opacity-100 group-hover/header:opacity-100"
        disabled={isConnecting}
        type="button"
      >
        <PlusIcon aria-hidden="true" size={14} />
      </button>
    </TooltipWrapper>
  );
};
