import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type React from "react";

export interface CaretInputProps {
  onChange: (type: "increase" | "decrease") => void;
}

export const CaretInput = ({ onChange }: CaretInputProps) => {
  return (
    <div className="ml-1 flex flex-col justify-between">
      <button
        className="flex size-[19px] cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-[inherit] transition-[var(--compass-transition-default)] hover:bg-bg-primary hover:text-text-light focus:shadow-[0_0_0_2px_var(--compass-color-border-primary-dark)]"
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
        className="flex size-[19px] cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-[inherit] transition-[var(--compass-transition-default)] hover:bg-bg-primary hover:text-text-light focus:shadow-[0_0_0_2px_var(--compass-color-border-primary-dark)]"
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
