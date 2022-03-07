import styled from "styled-components";
import { ColorNames, InvertedColorNames } from "@web/common/types/styles";
import {
  getColor,
  getDarkerColor,
  getInvertedColor,
} from "@web/common/utils/colors";
import { Flex } from "@web/components/Flex";

export interface Props {
  color?: ColorNames;
  bordered?: boolean;
  border?: string;
}

export const StyledFeedbackBtnContainer = styled(Flex)`
  position: absolute;
  top: 10%;
  right: 8%;
`;

export const Styled = styled.div<Props>`
  background: ${({ color }) => getColor(color || ColorNames.BLUE_3)};
  min-width: 158px;
  padding: 0 8px;
  height: 36px;
  display: flex;
  align-items: center;
  font-weight: 600;
  justify-content: center;
  color: ${({ color = InvertedColorNames.BLUE_3 }) =>
    getInvertedColor(color as InvertedColorNames)};
  cursor: pointer;
  border-radius: 7px;
  border: ${({ bordered, color = InvertedColorNames.BLUE_3, border }) =>
    border ||
    (bordered && `2px solid ${getInvertedColor(color as InvertedColorNames)}`)};

  &:focus {
    border-width: ${({ bordered }) => (bordered ? 3 : 2)}px;
  }

  &:hover {
    background: ${({ color }) => getDarkerColor(color || ColorNames.BLUE_3)};
    transition: background-color 0.2s;
  }
`;
