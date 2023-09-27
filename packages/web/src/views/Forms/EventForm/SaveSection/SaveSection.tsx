import React from "react";
import { colorNameByPriority } from "@core/constants/colors";
import { Priority } from "@core/constants/core.constants";
import { getBrighterColor } from "@core/util/color.utils";
import { SaveBtn } from "@web/components/Button";

import { StyledSubmitRow } from "../styled";

interface Props {
  onSubmit: () => void;
  priority: Priority;
}

export const SaveSection: React.FC<Props> = ({
  onSubmit: _onSubmit,
  priority,
}) => {
  const colorName = colorNameByPriority[priority];
  const color = getBrighterColor(colorName);

  return (
    <StyledSubmitRow>
      <SaveBtn
        background={color}
        minWidth={110}
        onClick={_onSubmit}
        role="tab"
        tabIndex={0}
        title="Save event"
      >
        Save
      </SaveBtn>
    </StyledSubmitRow>
  );
};
