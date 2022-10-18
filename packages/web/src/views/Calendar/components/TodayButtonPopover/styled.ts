import { ColorNames } from "@core/types/color.types";
import { getAlphaColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import styled from "styled-components";

export const StyledTodayPopoverContainer = styled(Flex)`
  padding: 12px;
  background: ${getAlphaColor(ColorNames.DARK_1, 0.8)};
`;

export const StyledTodayButton = styled(Text)`
  margin-left: 15px;

  &:hover {
    border-radius: 0;
  }
`;
