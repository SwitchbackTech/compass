import React from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { StyledStrawberryIcon } from "@web/components/Svg";

interface Props {}

export const StrawberryIcon: React.FC<Props> = () => {
  return (
    <div onClick={() => console.log("clicked")} role="button">
      <StyledStrawberryIcon hovercolor={getColor(ColorNames.GREY_5)} />
    </div>
  );
};
