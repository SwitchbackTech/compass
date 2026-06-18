import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type React from "react";

export interface CaretInputProps {
  onChange: (type: "increase" | "decrease") => void;
}

export const CaretInput = ({ onChange }: CaretInputProps) => {
  return (
    <div className="ml-1 flex flex-col justify-between">
      <button
        className="c-recurrence-caret"
        type="button"
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onChange("increase");
        }}
      >
        <CaretUp size={14} />
      </button>

      <button
        className="c-recurrence-caret"
        type="button"
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onChange("decrease");
        }}
      >
        <CaretDown size={14} />
      </button>
    </div>
  );
};
