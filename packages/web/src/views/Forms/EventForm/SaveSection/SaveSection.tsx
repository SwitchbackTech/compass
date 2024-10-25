import React from "react";
import { Priority } from "@core/constants/core.constants";
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
  return (
    <StyledSubmitRow>
      <SaveBtn
        minWidth={110}
        priority={priority}
        role="tab"
        tabIndex={0}
        title="Save event"
        onClick={_onSubmit}
      >
        Save
      </SaveBtn>
    </StyledSubmitRow>
  );
};
