import React from "react";
import { AlignItems, JustifyContent, Props } from "@web/components/Flex/styled";

import { Styled, StyledSpinner } from "./styled";

export const AbsoluteOverflowLoader = (props: Props) => (
  <Styled
    justifyContent={JustifyContent.CENTER}
    alignItems={AlignItems.CENTER}
    {...props}
  >
    <StyledSpinner />
  </Styled>
);
