import React, {
  forwardRef,
  ForwardRefRenderFunction,
  HTMLAttributes,
  Ref,
} from "react";

import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/components";
import { FocusableUnderlineLayout } from "@web/components/FocusableUnderlinedComponent";

import { Styled, Props as StyledProps } from "./styled";

export interface Props
  extends ClassNamedComponent,
    UnderlinedInput,
    StyledProps,
    HTMLAttributes<HTMLInputElement> {
  autoFocus?: boolean;
}

const InputComponent: ForwardRefRenderFunction<HTMLInputElement, Props> = (
  { withUnderline = true, ...props }: Props,
  ref: Ref<HTMLInputElement>
) => (
  <FocusableUnderlineLayout
    Component={Styled}
    ref={ref}
    withUnderline={withUnderline}
    {...props}
  />
);

export const Input = forwardRef(InputComponent);
