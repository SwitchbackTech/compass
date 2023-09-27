import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { BASE_COLORS } from "@core/constants/colors";
import { Flex } from "@web/components/Flex";

export const StyledShortcutTip = styled(Flex)`
  background-color: ${BASE_COLORS.LIGHT_GREY};
  border: 2px solid ${getColor(ColorNames.GREY_2)};
  border-radius: 3px;
  padding: 5px 10px;
`;
