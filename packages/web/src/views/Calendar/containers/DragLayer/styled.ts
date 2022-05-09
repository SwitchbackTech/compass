import styled from "styled-components";
import { Priority, Priorities } from "@core/core.constants";
import { getColor } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { ColorNames } from "@web/common/types/styles";

const hoverColorsByPriority = {
  [Priorities.UNASSIGNED]: getColor(ColorNames.GREY_5_BRIGHT),
  [Priorities.WORK]: getColor(ColorNames.GREY_3_BRIGHT),
  [Priorities.RELATIONS]: getColor(ColorNames.TEAL_4),
  [Priorities.SELF]: getColor(ColorNames.BLUE_3_BRIGHT),
};

interface StyledEventProps {
  backgroundColor: string;
  duration: number;
  height: number;
  priority: Priority;
  width: number;
}

export const StyledDraggableEvent = styled.div.attrs<StyledEventProps>(
  (props) => {
    const bgColor = getColor(colorNameByPriority[props.priority]);

    return {
      backgroundColor: bgColor,
      height: props.height,
      hoverColor: hoverColorsByPriority[props.priority],
      width: props.width,
    };
  }
)<StyledEventProps>`
  border-radius: 3px;
  position: absolute;
  width: ${(props) => props.width}px;
  height: ${({ height }) => height}px;
  background-color: ${(props) => props.backgroundColor};
  user-select: none;
  transition: background-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 0 0 transparent;
  /* cursor: "grabbing"; */

  &:hover,
  &.active {
    filter: drop-shadow(2px 4px 4px black);
  }

  & span {
    &:first-child {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
  }
`;
