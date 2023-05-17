import styled from "styled-components";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { ZIndex } from "@web/common/constants/web.constants";

export const StyledRightSidebar = styled.div`
  background: ${getColor(ColorNames.GREY_3)};
  bottom: 0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  color: ${getColor(ColorNames.WHITE_1)};
  height: calc(100% - 192px);
  padding: 10px;
  position: fixed;
  right: 0;
  width: 350px;
  z-index: ${ZIndex.MAX};
`;
