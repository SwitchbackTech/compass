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
      className="c-recurrence-weekday"
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
