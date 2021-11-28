import styled from 'styled-components';

import { colorNameByPriority } from '@common/styles/colors';
import { Flex } from '@components/Flex';
import { Textarea } from '@components/Textarea';
import { ColorNames, InvertedColorNames } from '@common/types/styles';
import { ANIMATION_TIME_3_MS } from '@common/constants/common';
import { Priorities } from '@common/types/entities';
import { getColor, getInvertedColor } from '@common/helpers/colors';
import { Button } from '@components/Button';

import { StyledProps } from './types';

export const Styled = styled.div<StyledProps>`
  ${({ isOpen }) =>
    isOpen
      ? `
      min-height: 355px;
      max-height: 500px;
      padding: 18px 30px;
  `
      : `
    max-height: 0;
    min-height: 0;
    padding: 0 30px;
  `}

  overflow: auto;
  box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  width: 585px;
  font-size: 20px;
  background: ${({ priority }) =>
    getColor(colorNameByPriority[priority || Priorities.WORK])};
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[
        priority || Priorities.WORK
      ] as unknown as InvertedColorNames
    )};
  transition: ${ANIMATION_TIME_3_MS};
`;

export const StyledTitleField = styled(Textarea)`
  background: transparent;
  /* padding: 10px 0; */
  height: 55px;
  font-size: 50px;
`;

export const StyledPriorityFlex = styled(Flex)`
  margin: 20px 0;
`;

export const StyledDescriptionField = styled(Textarea)`
  background: transparent;
  width: calc(100% - 20px) !important;
  font-size: 20px;
  position: relative;
`;

export const StiledSubmitButton = styled(Button)`
  background: ${getColor(ColorNames.WHITE_5)};
  color: ${getColor(ColorNames.GREY_1)};
  margin-top: 35px;

  &:hover {
    background: ${getColor(ColorNames.WHITE_3)};
  }
`;
