import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";
import { Flex } from "@web/components/Flex";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { GRID_LINE_OPACITY_PERCENT } from "@core/constants/colors";

const colBorder = `1px solid ${getColor(
  ColorNames.GREY_4
)}${GRID_LINE_OPACITY_PERCENT}`;

export const Columns = styled(Flex)`
  position: absolute;
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
  left: ${GRID_MARGIN_LEFT}px;
`;

export const StyledAllDayColumns = styled(Columns)`
  height: 100%;
`;

export const StyledGridCol = styled.div<{ color: string }>`
  border-left: ${colBorder};
  background: ${({ color }) => color};
  flex-basis: 100%;
  height: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  position: relative;
`;

export const StyledGridCols = styled(Columns)`
  height: calc(24 * 100% / 11);
`;
