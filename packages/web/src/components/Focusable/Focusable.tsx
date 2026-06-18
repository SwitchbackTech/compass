import {
  type ChangeEventHandler,
  type ElementType,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useState,
} from "react";
import { type UnderlinedInput } from "@web/common/types/component.types";
import { Divider } from "@web/components/Divider/Divider";

export interface Props
  extends UnderlinedInput,
    Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  autoFocus?: boolean;
  bgColor?: string;
  Component: ElementType;
  name?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  underlineColor?: string;
  value?: string | number | readonly string[];
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
      [props.onFocus],
    );

    const onBlur = useCallback(
      (event: FocusEvent<HTMLElement>) => {
        setIsFocused(false);
        props.onBlur?.(event);
      },
      [props.onBlur],
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
