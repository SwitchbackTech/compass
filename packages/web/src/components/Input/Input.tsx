import React, {
  type ForwardRefRenderFunction,
  type HTMLAttributes,
  type Ref,
  forwardRef,
} from "react";
import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";
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
