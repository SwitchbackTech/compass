import {
  AlignItems,
  type FlexProps,
  JustifyContent,
} from "@web/components/Flex/Flex";
import { Styled, StyledSpinner } from "./styled";

export const AbsoluteOverflowLoader = (props: FlexProps) => (
  <Styled
    justifyContent={JustifyContent.CENTER}
    alignItems={AlignItems.CENTER}
    {...props}
  >
    <StyledSpinner />
  </Styled>
);
