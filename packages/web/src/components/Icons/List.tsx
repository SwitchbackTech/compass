import { List } from "@phosphor-icons/react";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import styled from "styled-components";

export const StyledListIcon = styled(List)`
  color: ${getColor(ColorNames.GREY_5)};
  transition: color 0.3s ease;

  &:hover {
    color: ${getColor(ColorNames.TEAL_3)};
  }
`;