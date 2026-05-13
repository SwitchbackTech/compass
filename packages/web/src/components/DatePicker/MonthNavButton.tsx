import type React from "react";

const MONTH_NAV_BUTTON_HOVER_COLOR = "rgba(255,255,255,0.2)";

type MonthNavButtonProps = {
  ariaLabel: string;
  children: React.ReactNode;
  color: string;
  isSidebarStyle?: boolean;
  onClick: () => void;
};

export const MonthNavButton = ({
  ariaLabel,
  children,
  color,
  isSidebarStyle = false,
  onClick,
}: MonthNavButtonProps) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (isSidebarStyle) return;

      e.currentTarget.style.backgroundColor = MONTH_NAV_BUTTON_HOVER_COLOR;
    }}
    onMouseLeave={(e) => {
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
