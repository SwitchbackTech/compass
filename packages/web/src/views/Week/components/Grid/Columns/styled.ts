import styled from "styled-components";
import {
  EVENT_WIDTH_MINIMUM,
  GRID_MARGIN_LEFT,
} from "@web/views/Week/layout.constants";

export const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(${EVENT_WIDTH_MINIMUM}px, 1fr));
  left: ${GRID_MARGIN_LEFT}px;
  position: absolute;
  top: 0;
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
`;
