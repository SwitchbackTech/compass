import type React from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

const MONTH_NAV_BUTTON_HOVER_COLOR = "rgba(255,255,255,0.2)";

type MonthNavButtonProps = {
  ariaLabel: string;
  children: React.ReactNode;
  color: string;
  isSidebarStyle?: boolean;
  onClick: () => void;
  shortcut?: string | string[];
  holdHintKeys?: readonly string[];
  showHoldHints?: boolean;
};

export const MonthNavButton = ({
  ariaLabel,
  children,
  color,
  isSidebarStyle = false,
  onClick,
  shortcut,
  holdHintKeys,
  showHoldHints = false,
}: MonthNavButtonProps) => {
  const button = (
    <button
      aria-label={ariaLabel}
      className="c-focus-ring"
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isSidebarStyle) return;

        e.currentTarget.style.backgroundColor = MONTH_NAV_BUTTON_HOVER_COLOR;
      }}
      onMouseLeave={(e) => {
        if (isSidebarStyle) return;

        e.currentTarget.style.backgroundColor = "transparent";
      }}
      onFocus={(e) => {
        if (isSidebarStyle) return;

        e.currentTarget.style.backgroundColor = MONTH_NAV_BUTTON_HOVER_COLOR;
      }}
      onBlur={(e) => {
        if (isSidebarStyle) return;

        e.currentTarget.style.backgroundColor = "transparent";
      }}
      style={{
        cursor: "pointer",
        color,
        background: "transparent",
        border: "1px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: isSidebarStyle ? "4px" : "50%",
        opacity: isSidebarStyle ? 0.9 : 1,
        transition: "background-color 0.2s, border-color 0.2s, opacity 0.2s",
      }}
      type="button"
    >
      {children}
    </button>
  );

  const withHoldHint =
    showHoldHints && holdHintKeys && holdHintKeys.length > 0 ? (
      <span className="relative inline-flex">
        {button}
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-0.5 -translate-x-1/2">
          <ShortcutKeys keys={[...holdHintKeys]} />
        </span>
      </span>
    ) : (
      button
    );

  if (!shortcut) return withHoldHint;

  return <TooltipWrapper shortcut={shortcut}>{withHoldHint}</TooltipWrapper>;
};
