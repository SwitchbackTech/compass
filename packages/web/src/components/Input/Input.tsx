import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";
import React, {
  type ForwardRefRenderFunction,
  forwardRef,
  type HTMLAttributes,
  type Ref,
} from "react";
import { Focusable } from "../Focusable/Focusable";
import { StyledInput, type Props as StyledProps } from "./styled";

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
