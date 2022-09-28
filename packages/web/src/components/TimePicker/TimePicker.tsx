import React, { useState } from "react";
import ReactSelect, { Props as RSProps } from "react-select";
import { SelectOption } from "@web/common/types/components";
import { Option_Time } from "@web/common/types/util.types";

import { StyledTimePicker, StyledDivider } from "./styled";

export interface Props extends Omit<RSProps, "value"> {
  bgColor: string;
  options?: Option_Time[];
  selectClassName?: string;
  value?: SelectOption<string>;
  // step?: number;
}
export const TimePicker: React.FC<Props> = ({
  bgColor,
  options,
  onFocus: _onFocus,
  onBlur: _onBlur,
  onMenuClose = () => {},
  onMenuOpen = () => {},
  selectClassName,
  ...props
}) => {
  const [isFocused, toggleIsFocused] = useState(false);
  const [isMenuOpened, toggleMenu] = useState(false);

  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (_onFocus) _onFocus(e);
    toggleIsFocused(true);
  };

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (_onBlur) _onBlur(e);
    toggleIsFocused(false);
  };

  return (
    <StyledTimePicker bgColor={bgColor} open={isMenuOpened}>
      <ReactSelect
        onMenuOpen={() => {
          setTimeout(() => toggleMenu(true));
          onMenuOpen();
        }}
        onMenuClose={() => {
          toggleMenu(false);
          onMenuClose();
        }}
        tabSelectsValue={false}
        noOptionsMessage={() => null}
        classNamePrefix="timepicker"
        options={options}
        {...props}
        className={selectClassName}
        onFocus={onFocus}
        onBlur={onBlur}
        maxMenuHeight={4 * 41}
        isOptionSelected={(option) => option.value === props?.value?.value}
      />
      {isFocused && <StyledDivider width="calc(100% - 26px)" />}
    </StyledTimePicker>
  );
};
