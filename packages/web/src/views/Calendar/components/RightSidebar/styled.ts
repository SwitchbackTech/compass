import styled from "styled-components";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { Flex } from "@web/components/Flex";
import { ZIndex } from "@web/common/constants/web.constants";

export const StyledRightSidebar = styled(Flex)`
  background: ${getColor(ColorNames.GREY_3)};
  bottom: 0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  color: ${getColor(ColorNames.WHITE_1)};
  display: flex;
  flex-direction: column;
  height: calc(100% - 82px);
  justify-content: space-between;
  padding: 10px;
  position: fixed;
  right: 0;
  z-index: ${ZIndex.MAX};
`;
