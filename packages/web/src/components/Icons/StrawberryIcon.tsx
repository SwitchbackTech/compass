import React from "react";
import { getColor } from "@web/common/utils/colors";
import { ColorNames } from "@web/common/types/styles";
import { StyledStrawberryIcon } from "@web/components/Svg";

interface Props {}

export const StrawberryIcon: React.FC<Props> = () => {
  return (
    <div onClick={() => console.log("clicked")} role="button">
      <StyledStrawberryIcon hovercolor={getColor(ColorNames.DARK_5)} />
    </div>
  );
};
