import type React from "react";
import { darken } from "@core/util/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { theme } from "@web/common/styles/theme";

export interface WeekDayProps {
  day: string;
  bgColor: string;
  onClick: () => void;
  selected: boolean;
}

export const WeekDay = ({ day, bgColor, onClick, selected }: WeekDayProps) => {
  return (
    <button
      type="button"
      className="size-6 cursor-pointer rounded-full border border-[var(--compass-color-border-primary-dark)] bg-[var(--weekday-bg)] text-m transition-all duration-300 focus:shadow-[0_0_0_2px_var(--compass-color-border-primary-dark)] data-[selected=true]:bg-[var(--weekday-selected-bg)] data-[selected=true]:text-[var(--weekday-selected-text)] data-[selected=false]:hover:bg-bg-primary data-[selected=false]:hover:text-text-light"
      data-selected={selected}
      style={
        {
          "--weekday-bg": bgColor,
          "--weekday-selected-bg": darken(bgColor, 30),
          "--weekday-selected-text": theme.getContrastText(bgColor),
        } as CSSVariables
      }
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {day.charAt(0).toUpperCase()}
    </button>
  );
};
