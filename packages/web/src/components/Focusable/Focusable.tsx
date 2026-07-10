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

export const INPUT_RESET_CLASSNAME =
  "h-8.5 border-0 px-2 outline-none placeholder:text-text-dark-placeholder hover:bg-border-primary";

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
        {/*
          Keep the underline mounted whenever `withUnderline` and toggle its
          visible width via focus, instead of mounting/unmounting it on blur.
          The Divider always reserves 2px of height while mounted, so
          unmounting it on blur shifted layout — which, in the date picker,
          moved the hovered day out from under the cursor between mousedown and
          mouseup and swallowed the first click. A stable layout fixes that.
        */}
        {!!withUnderline && (
          <Divider color={underlineColor} toggled={isFocused} />
        )}
      </>
    );
  },
);
