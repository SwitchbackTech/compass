import React, {
  ForwardedRef,
  forwardRef,
  ForwardRefRenderFunction,
  RefObject,
  useRef,
} from "react";
import { FocusableUnderlineLayout } from "@web/components/FocusableUnderlinedComponent";

import { Styled } from "./styled";
import { Props } from "./types";

const Component: ForwardRefRenderFunction<HTMLTextAreaElement, Props> = (
  { withUnderline = true, ...props }: Props,
  parentRef: ForwardedRef<HTMLTextAreaElement>
) => {
  const newRef = useRef<HTMLTextAreaElement>(null);
  const ref = (parentRef || newRef) as RefObject<HTMLTextAreaElement>;

  return (
    <FocusableUnderlineLayout
      Component={Styled}
      ref={ref}
      withUnderline={withUnderline}
      {...props}
    />
  );
};

export const Textarea = forwardRef(Component);
