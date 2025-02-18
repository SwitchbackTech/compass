import React, { forwardRef, ReactElement, Ref, useState } from "react";
import { Divider } from "@web/components/Divider";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/component.types";

export type Props<T extends ClassNamedComponent> = T &
  UnderlinedInput & {
    autoFocus?: boolean;
    Component: React.ComponentType<T>;
    underlineColor?: string;
  };

const _Focusable = <T,>(
  {
    autoFocus = false,
    Component,
    underlineColor,
    withUnderline,
    ...props
  }: Props<T>,
  ref: Ref<HTMLDivElement>,
) => {
  const [isFocused, toggleFocused] = useState(autoFocus);
  const rest = props as unknown as T;

  return (
    <>
      <Component
        {...rest}
        ref={ref}
        onFocus={() => toggleFocused(true)}
        onBlur={() => toggleFocused(false)}
        autoFocus={autoFocus}
      />
      {!!withUnderline && isFocused && <Divider color={underlineColor} />}
    </>
  );
};

export const Focusable = forwardRef(_Focusable) as <
  T extends ClassNamedComponent,
>(
  p: Props<T> & { ref?: Ref<HTMLDivElement | HTMLTextAreaElement> },
) => ReactElement;
