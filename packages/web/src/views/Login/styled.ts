import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

export const StyledLogin = styled(Flex)`
  align-items: center;
  background: ${getColor(ColorNames.BLUE_2)};
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  left: 0;
  min-height: 100vh;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
`;

export const GoogleBtnWrapper = styled.div`
  padding: 60px;
`;
