import {
  FocusEvent,
  HTMLAttributes,
  PropsWithChildren,
  forwardRef,
  useCallback,
  useState,
} from "react";
import { StyledComponent } from "styled-components";
import { UnderlinedInput } from "@web/common/types/component.types";
import { Divider } from "@web/components/Divider";

export interface Props extends UnderlinedInput, HTMLAttributes<HTMLElement> {
  autoFocus?: boolean;
  underlineColor?: string;
  Component: StyledComponent<any, any, PropsWithChildren<any>, never>;
}

export const Focusable = forwardRef<HTMLElement, Props>(
  (
    {
      autoFocus = false,
      Component,
      underlineColor,
      withUnderline,
      ...props
    }: Props,
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const onFocus = useCallback(
      (event: FocusEvent<HTMLElement>) => {
        setIsFocused(true);
        props.onFocus?.(event);
      },
      [props.onFocus, setIsFocused],
    );

    const onBlur = useCallback(
      (event: FocusEvent<HTMLElement>) => {
        setIsFocused(false);
        props.onBlur?.(event);
      },
      [props.onBlur, setIsFocused],
    );

    return (
      <>
        <Component
          {...props}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus={autoFocus}
          ref={ref}
        />
        {!!withUnderline && isFocused && <Divider color={underlineColor} />}
      </>
    );
  },
);
