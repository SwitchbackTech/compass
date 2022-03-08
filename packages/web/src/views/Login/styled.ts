import styled from "styled-components";

import { getColor } from "@web/common/utils/colors";
import { ColorNames } from "@web/common/types/styles";

export const StyledLogin = styled.div`
  background: ${getColor(ColorNames.DARK_2)};
  bottom: 0;
  left: 0;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
`;
