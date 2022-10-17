import React, { useState } from "react";
import ReactSelect, { Props as RSProps } from "react-select";
import { Key } from "ts-key-enum";
import { SelectOption } from "@web/common/types/component.types";
import { Option_Time } from "@web/common/types/util.types";

import { StyledTimePicker, StyledDivider } from "./styled";

export interface Props extends Omit<RSProps, "value"> {
  bgColor: string;
  onChange: (option: SelectOption<string>) => void;
  options?: Option_Time[];
  selectClassName?: string;
  value: SelectOption<string>;
}

export const TimePicker: React.FC<Props> = ({
  bgColor,
  onChange: _onChange,
  options,
  selectClassName,
  value,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isMenuOpened, setIsMenuOpen] = useState(false);

  const TIMEPICKER = "timepicker";
  let scrollTimer: number;

  return (
    <StyledTimePicker bgColor={bgColor} isOpen={isMenuOpened}>
      <ReactSelect
        {...props}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        value={value}
        maxMenuHeight={4 * 41}
        noOptionsMessage={() => "Nothin'. Typo?"}
        onBlur={() => setIsFocused(false)}
        onFocus={() => {
          setIsFocused(true);
        }}
        onChange={_onChange}
        onKeyDown={(e) => {
          const key = e.key;

          if (key === Key.Enter || key === Key.Backspace) {
            e.stopPropagation();
          }

          if (key === Key.Shift) {
            e.stopPropagation();
          }

          if (key === Key.Escape) {
            setIsMenuOpen(false);
            e.stopPropagation();
          }
        }}
        onMenuOpen={() => {
          scrollTimer = window.setTimeout(() => {
            const defaultOpt = document.getElementsByClassName(
              `${TIMEPICKER}__option--is-selected`
            )[0];
            if (defaultOpt) {
              defaultOpt.scrollIntoView();
            }
          }, 15);

          setIsMenuOpen(true);
        }}
        onMenuClose={() => {
          setIsMenuOpen(false);
          clearTimeout(scrollTimer);
        }}
        openMenuOnFocus={true}
        options={options}
        tabSelectsValue={false}
      />
      {isFocused && <StyledDivider width="calc(100% - 16px)" />}
    </StyledTimePicker>
  );
};
