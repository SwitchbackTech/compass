import styled from "styled-components";
import { List } from "@phosphor-icons/react";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";

export const StyledListIcon = styled(List)`
  color: ${getColor(ColorNames.GREY_5)};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
