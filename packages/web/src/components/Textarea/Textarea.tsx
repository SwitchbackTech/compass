import React, {
  ForwardRefRenderFunction,
  ForwardedRef,
  RefObject,
  forwardRef,
  useRef,
} from "react";
import { Focusable } from "@web/components/Focusable/Focusable";
import { StyledTextarea } from "./styled";
import { TextareaProps } from "./types";

const _Textarea: ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextareaProps
> = (
  { withUnderline = true, underlineColor, ...props }: TextareaProps,
  parentRef: ForwardedRef<HTMLTextAreaElement>,
) => {
  const newRef = useRef<HTMLTextAreaElement>(null);
  const ref = (parentRef || newRef) as RefObject<HTMLTextAreaElement>;

  return (
    <Focusable
      Component={StyledTextarea}
      ref={ref}
      underlineColor={underlineColor}
      withUnderline={withUnderline}
      {...props}
    />
  );
};

export const Textarea = forwardRef(_Textarea);
