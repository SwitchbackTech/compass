import classNames from "classnames";
import {
  type ForwardRefRenderFunction,
  forwardRef,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";
import { Focusable } from "../Focusable/Focusable";

export interface Props
  extends ClassNamedComponent,
    UnderlinedInput,
    InputHTMLAttributes<HTMLInputElement> {
  autoFocus?: boolean;
  bgColor?: string;
}

export const InputBase = forwardRef<HTMLInputElement, Props>(
  (
    { bgColor, className, style, withUnderline: _withUnderline, ...props },
    ref,
  ) => (
    <input
      {...props}
      className={classNames(
        "h-8.5 border-0 px-2 outline-none transition-colors duration-300 placeholder:text-text-dark-placeholder hover:bg-border-primary",
        className,
      )}
      ref={ref}
      style={{ ...style, backgroundColor: bgColor }}
    />
  ),
);

InputBase.displayName = "InputBase";

const InputComponent: ForwardRefRenderFunction<HTMLInputElement, Props> = (
  { withUnderline = true, ...props }: Props,
  ref: Ref<HTMLInputElement>,
) => (
  <Focusable
    Component={InputBase}
    ref={ref}
    withUnderline={withUnderline}
    {...props}
  />
);

export const Input = forwardRef(InputComponent);
