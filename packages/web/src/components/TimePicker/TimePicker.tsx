import React, { useState } from 'react';
import ReactSelect, { NamedProps as ReactSelectProps } from 'react-select';

import { getTimes } from '@common/helpers';
import { SelectOption } from '@common/types/components';

import { Styled, StyledDivider } from './styled';

export interface Props extends Omit<ReactSelectProps, 'value'> {
  calssName?: string;
  selectClassName?: string;
  value?: SelectOption<string>;
  // step?: number;
}

export const TimePicker: React.FC<Props> = ({
  className,
  selectClassName,
  onFocus: _onFocus,
  onBlur: _onBlur,
  onMenuClose = () => {},
  onMenuOpen = () => {},
  ...props
}) => {
  const [isFocused, toggleIsFocused] = useState(false);
  const [isMenuOpened, toggleMenu] = useState(false);
  const options = getTimes().map((value) => ({ value, label: value }));

  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (_onFocus) _onFocus(e);
    toggleIsFocused(true);
  };

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (_onBlur) _onBlur(e);
    toggleIsFocused(false);
  };

  return (
    <Styled open={isMenuOpened}>
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
    </Styled>
  );
};
