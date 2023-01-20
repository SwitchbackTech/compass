import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

export const StyledTodayButton = styled(Flex)`
  color: ${getColor(ColorNames.WHITE_1)};
  cursor: pointer;
  font-size: 19px;
`;
