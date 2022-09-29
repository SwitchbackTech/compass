import React, { useState } from "react";
import ReactSelect, { Props as RSProps } from "react-select";
import { Key } from "ts-keycode-enum";
import { SelectOption } from "@web/common/types/components";
import { Option_Time } from "@web/common/types/util.types";

import { StyledTimePicker, StyledDivider } from "./styled";

export interface Props extends Omit<RSProps, "value"> {
  bgColor: string;
  options?: Option_Time[];
  selectClassName?: string;
  defaultOption: SelectOption<string>;
}
export const TimePicker: React.FC<Props> = ({
  bgColor,
  options,
  selectClassName,
  defaultOption,
  ...props
}) => {
  const [isFocused, toggleIsFocused] = useState(false);
  const [isMenuOpened, toggleMenu] = useState(false);

  const TIMEPICKER = "timepicker";
  let scrollTimer: number;

  return (
    <StyledTimePicker bgColor={bgColor} isOpen={isMenuOpened}>
      <ReactSelect
        {...props}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        defaultValue={defaultOption}
        maxMenuHeight={4 * 41}
        noOptionsMessage={() => "No matches. Typo?"}
        onBlur={() => toggleIsFocused(false)}
        onFocus={() => toggleIsFocused(true)}
        onInputChange={() => console.log("input changed")}
        onKeyDown={(e) => {
          if (e.which === Key.Enter || e.which === Key.Backspace) {
            e.stopPropagation();
          }
          if (e.which === Key.Escape) {
            toggleMenu(false);
            e.stopPropagation();
          }
        }}
        onMenuOpen={() => {
          scrollTimer = window.setTimeout(() => {
            const defaultOpt = document.getElementsByClassName(
              `${TIMEPICKER}__option--is-selected`
            )[0];
            if (defaultOpt) {
              console.log(defaultOpt);
              defaultOpt.scrollIntoView();
            }
          }, 15);
          toggleMenu(true);
        }}
        onMenuClose={() => {
          toggleMenu(false);
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

//++
// const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
//   // if (_onBlur) _onBlur(e);
//   console.log("blurred");
//   toggleIsFocused(false);
// };
