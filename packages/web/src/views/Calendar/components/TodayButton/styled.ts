import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

export const StyledTodayButton = styled(Flex)`
  align-items: center;
  border: 1px solid ${getColor(ColorNames.GREY_4)};
  border-radius: 4px;
  color: ${getColor(ColorNames.GREY_4)};
  /* color: #4e516a; */
  cursor: pointer;
  display: flex;
  font-size: 17px;
  min-width: 80px;
  padding: 0 10px;

  &:hover {
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }
`;
