import type React from "react";

const MONTH_NAV_BUTTON_HOVER_COLOR = "rgba(255,255,255,0.2)";

type MonthNavButtonProps = {
  ariaLabel: string;
  children: React.ReactNode;
  color: string;
  onClick: () => void;
};

export const MonthNavButton = ({
  ariaLabel,
  children,
  color,
  onClick,
}: MonthNavButtonProps) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = MONTH_NAV_BUTTON_HOVER_COLOR;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    style={{
      cursor: "pointer",
      color,
      background: "transparent",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      transition: "background-color 0.2s",
    }}
    type="button"
  >
    {children}
  </button>
);
