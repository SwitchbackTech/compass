import React from "react";
import { Priority } from "@core/constants/core.constants";
import { brighten } from "@core/util/color.utils";
import { SaveBtn } from "@web/components/Button";
import { colorByPriority } from "@web/common/styles/theme";

import { StyledSubmitRow } from "../styled";

interface Props {
  onSubmit: () => void;
  priority: Priority;
}

export const SaveSection: React.FC<Props> = ({
  onSubmit: _onSubmit,
  priority,
}) => {
  const origColor = colorByPriority[priority];
  const color = brighten(origColor);

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
