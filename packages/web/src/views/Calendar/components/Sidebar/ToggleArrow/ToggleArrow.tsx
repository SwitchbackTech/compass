import React from 'react';

import { ArrowDownFilledIcon } from '@assets/svg';
import { getColor } from '@common/helpers/colors';
import { ColorNames } from '@common/types/styles';

export interface Props {
  isToggled?: boolean;
  onToggle?: () => void;
}

export const ToggleArrow: React.FC<Props> = ({
  isToggled = false,
  onToggle = () => {},
  ...props
}) => (
  <ArrowDownFilledIcon
    {...props}
    cursor="pointer"
    transform={!isToggled ? 'rotate(-90)' : ''}
    onClick={onToggle}
    color={getColor(ColorNames.WHITE_1)}
  />
);
