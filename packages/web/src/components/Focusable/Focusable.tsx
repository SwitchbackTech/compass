import React, { ReactElement, Ref, forwardRef, useState } from "react";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/component.types";
import { Divider } from "@web/components/Divider";

export type Props<T extends ClassNamedComponent> = T &
  UnderlinedInput & {
    autoFocus?: boolean;
    Component: React.ComponentType<T>;
    underlineColor?: string;
  };

const _Focusable = <T extends ClassNamedComponent>(
  {
    autoFocus = false,
    Component,
    underlineColor,
    withUnderline,
    ...props
  }: Props<T>,
  ref: Ref<HTMLDivElement>,
) => {
  const [isFocused, setIsFocused] = useState(false);
  const rest = props as unknown as T;

  return (
    <>
      <Component
        {...rest}
        ref={ref}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
        }}
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
