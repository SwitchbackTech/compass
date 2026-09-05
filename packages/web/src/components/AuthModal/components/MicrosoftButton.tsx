import classNames from "classnames";
import type React from "react";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

const MicrosoftLogo = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 21 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

export const MicrosoftButton = ({
  onClick,
  disabled,
  label = "Continue with Microsoft",
  shortcutKey,
  style,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  shortcutKey?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={classNames(
        "inline-flex h-10 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-[#1f1f1f] bg-[#fff] px-3 font-medium text-[#1f1f1f] text-sm transition-[background-color,box-shadow,transform] duration-200",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "c-button-elevated cursor-pointer hover:bg-[#f8f8f8]",
      )}
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        ...style,
      }}
    >
      <MicrosoftLogo size={18} />
      <span>{label}</span>
      {shortcutKey ? (
        <ShortcutHint className="shrink-0">{shortcutKey}</ShortcutHint>
      ) : null}
    </button>
  );
};
