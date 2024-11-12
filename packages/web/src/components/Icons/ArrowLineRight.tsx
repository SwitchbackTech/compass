import styled from "styled-components";
import { ArrowLineRight } from "@phosphor-icons/react";
import { ZIndex } from "@web/common/constants/web.constants";

export const ArrowLineRightIcon = styled(ArrowLineRight)`
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.lightInactive};
  position: absolute;
  right: 7px;
  bottom: 8px;
  transition: filter 0.2s ease;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    filter: brightness(130%);
  }
`;
