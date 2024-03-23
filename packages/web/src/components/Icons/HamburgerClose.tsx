import React, { FC } from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

import { StyledHamburgerClose } from "../Svg";

interface Props {}

export const HamburgerClose: FC<Props> = () => {
  return <StyledHamburgerClose hovercolor={getColor(ColorNames.GREY_5)} />;
};
