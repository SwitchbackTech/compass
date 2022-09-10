import React from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/constants/colors";
import { StyledStrawberryIcon } from "@web/components/Svg";

interface Props {}

export const StrawberryIcon: React.FC<Props> = () => {
  return (
    <div onClick={() => console.log("clicked")} role="button">
      <StyledStrawberryIcon hovercolor={getColor(ColorNames.DARK_5)} />
    </div>
  );
};
