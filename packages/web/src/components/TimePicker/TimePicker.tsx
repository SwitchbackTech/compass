import React, { ForwardedRef, forwardRef, useRef, useState } from "react";
import ReactSelect, { Props as RSProps, SelectInstance } from "react-select";
import { Key } from "ts-key-enum";
import { SelectOption } from "@web/common/types/component.types";
import { Option_Time } from "@web/common/types/util.types";

import { StyledTimePicker, StyledDivider } from "./styled";

export interface Props extends Omit<RSProps, "value"> {
  bgColor: string;
  nextElementRef?: React.RefObject<HTMLTextAreaElement>;
  onChange: (option: SelectOption<string>) => void;
  options?: Option_Time[];
  selectClassName?: string;
  value: SelectOption<string>;
}

export const _TimePicker = (
  {
    bgColor,
    nextElementRef,
    onChange: _onChange,
    options,
    selectClassName,
    value,
    ...props
  }: Props,
  ref: ForwardedRef<ReactSelect>
  // ref: Ref<SelectInstance>
) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isMenuOpened, setIsMenuOpen] = useState(false);

  const TIMEPICKER = "timepicker";
  let scrollTimer: number;

  return (
    <StyledTimePicker bgColor={bgColor} isOpen={isMenuOpened}>
      <ReactSelect
        {...props}
        ref={ref}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        value={value}
        maxMenuHeight={4 * 41}
        noOptionsMessage={() => "Nothin'. Typo?"}
        onBlur={() => {
          console.log("blurred");
          setIsFocused(false);
        }}
        onFocus={() => {
          console.log("focused");
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
          console.log("closed menu");
          setIsFocused(false);
          setIsMenuOpen(false);
          clearTimeout(scrollTimer);

          if (nextElementRef && nextElementRef.current) {
            console.log("focusing on next input...");
            nextElementRef.current.focus();
          } else {
            console.log("doing nothing with refs");
          }
        }}
        openMenuOnFocus={true}
        options={options}
        tabSelectsValue={false}
      />
      {isFocused && <StyledDivider width="calc(100% - 16px)" />}
    </StyledTimePicker>
  );
};

export const TimePicker = forwardRef(_TimePicker);
