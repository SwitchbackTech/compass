import styled from "styled-components";
import { ArrowLineLeft } from "@phosphor-icons/react";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { ZIndex } from "@web/common/constants/web.constants";

export const ArrowLineLeftIcon = styled(ArrowLineLeft)`
  cursor: pointer;
  color: ${getColor(ColorNames.GREY_6)};
  position: absolute;
  right: 7px;
  bottom: 8px;
  transition: filter 0.2s ease;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    filter: brightness(130%);
  }
`;
