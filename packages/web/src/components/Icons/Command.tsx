import styled from "styled-components";
import { Command } from "@phosphor-icons/react";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";

export const StyledCommandIcon = styled(Command)`
  color: ${getColor(ColorNames.GREY_5)};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
