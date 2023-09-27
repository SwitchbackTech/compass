import React, { FC } from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

import { StyledHamburgerMenuIcon } from "../Svg";

interface Props {}

export const HamburgerIcon: FC<Props> = () => {
  return <StyledHamburgerMenuIcon hovercolor={getColor(ColorNames.GREY_5)} />;
};
