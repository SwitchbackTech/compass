import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import {
  getBrighterColor,
  getColor,
  getInvertedColor,
} from "@core/util/color.utils";
import { BASE_COLORS } from "@core/constants/colors";
import { Flex } from "@web/components/Flex";

export const StyledFeedbackBtnContainer = styled(Flex)`
  position: absolute;
  top: 10%;
  right: 8%;
`;

const Btn = styled.div`
  align-items: center;
  border-radius: 2px;
  display: flex;
  justify-content: center;
  cursor: pointer;
`;

interface PalletteProps {
  color?: ColorNames | string;
  bordered?: boolean;
  border?: string;
}

export const PalletteBtn = styled(Btn)<PalletteProps>`
  background: ${({ color }) => getColor(color)};
  color: ${({ color }) => getInvertedColor(color)};
  min-width: 158px;
  padding: 0 8px;
  border: ${({ border, bordered }) =>
    border || (bordered && `2px solid ${BASE_COLORS.DEEP_BLUE}`)};

  &:focus {
    border-width: ${({ bordered }) => (bordered ? 2 : 1)}px;
  }

  &:hover {
    background: ${({ color }) => getInvertedColor(color)};
    color: ${({ color }) => getBrighterColor(color)};
    transition: background-color 0.5s;
    transition: color 0.55s;
  }
`;
interface CustomProps {
  background: string;
  color?: string;
  minWidth: number;
}

export const StyledSaveBtn = styled(PalletteBtn)<CustomProps>`
  background: ${({ background }) => background};
  color: ${({ color }) => color};
  min-width: ${({ minWidth }) => minWidth}px;

  &:focus {
    border: 2px solid ${BASE_COLORS.DEEP_BLUE};
  }
  &:hover {
    filter: brightness(120%);
  }
`;
