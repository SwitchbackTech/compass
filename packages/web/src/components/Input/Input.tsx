import React, {
  forwardRef,
  ForwardRefRenderFunction,
  HTMLAttributes,
  Ref,
} from "react";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/component.types";

import { StyledInput, Props as StyledProps } from "./styled";
import { Focusable } from "../Focusable/Focusable";

export interface Props
  extends ClassNamedComponent,
    UnderlinedInput,
    StyledProps,
    HTMLAttributes<HTMLInputElement> {
  autoFocus?: boolean;
  bgColor?: string;
}

const InputComponent: ForwardRefRenderFunction<HTMLInputElement, Props> = (
  { withUnderline = true, ...props }: Props,
  ref: Ref<HTMLInputElement>,
) => (
  <Focusable
    Component={StyledInput}
    ref={ref}
    withUnderline={withUnderline}
    {...props}
  />
);

export const Input = forwardRef(InputComponent);
