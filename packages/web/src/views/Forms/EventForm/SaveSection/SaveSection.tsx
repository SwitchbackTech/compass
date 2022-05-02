import React from "react";

import { StyledSubmitButton, StyledSubmitRow } from "../styled";

interface Props {
  onSubmit: () => void;
}

export const SaveSection: React.FC<Props> = ({ onSubmit: _onSubmit }) => {
  return (
    <StyledSubmitRow>
      <StyledSubmitButton bordered={true} onClick={_onSubmit}>
        Save
      </StyledSubmitButton>
    </StyledSubmitRow>
  );
};
