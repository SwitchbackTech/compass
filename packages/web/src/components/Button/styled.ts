import styled from "styled-components";
import { ColorNames, InvertedColorNames } from "@web/common/types/styles";
import {
  getBrighterColor,
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
  align-items: center;
  background: ${({ color }) => getColor(color)};
  color: ${({ color }) => getInvertedColor(color)};
  display: flex;
  min-width: 158px;
  padding: 0 8px;
  height: 36px;
  font-weight: 600;
  justify-content: center;
  cursor: pointer;
  border-radius: 7px;
  border: ${({ bordered, color = InvertedColorNames.BLUE_3, border }) =>
    border ||
    (bordered && `2px solid ${getInvertedColor(color as InvertedColorNames)}`)};

  &:focus {
    border-width: ${({ bordered }) => (bordered ? 3 : 2)}px;
  }

  &:hover {
    background: ${({ color }) => getBrighterColor(color)};
    transition: background-color 0.2s;
  }
`;
