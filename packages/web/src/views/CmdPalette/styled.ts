import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

export const StyledKeyTip = styled(Flex)`
  border: 2px solid ${getColor(ColorNames.GREY_2)};
  border-radius: 3px;
  font-size: 11px;
  margin-left: 20px;
  padding: 3px 8px;
`;
