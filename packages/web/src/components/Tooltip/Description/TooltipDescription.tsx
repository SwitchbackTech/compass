import React, { FC } from "react";
import { Text } from "@web/components/Text";

import { StyledDescription } from "./styled";

interface Props {
  description: string;
}

export const TooltipDescription: FC<Props> = ({ description }) => {
  return (
    <StyledDescription>
      <Text size={11}>{description}</Text>
    </StyledDescription>
  );
};
