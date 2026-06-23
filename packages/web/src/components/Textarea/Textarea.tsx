import classNames from "classnames";
import {
  type ForwardedRef,
  type ForwardRefRenderFunction,
  forwardRef,
  useRef,
} from "react";
import TextareaAutoSize from "react-textarea-autosize";
import { Focusable } from "@web/components/Focusable/Focusable";
import { type TextareaProps } from "./types";

const TextareaBase = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      heightFitsContent: _heightFitsContent,
      underlineColor: _underlineColor,
      withUnderline: _withUnderline,
      ...props
    },
    ref,
  ) => (
    <TextareaAutoSize
      {...props}
      className={classNames(
        "resize-none border-0 outline-none placeholder:text-text-dark-placeholder",
        className,
      )}
      ref={ref}
    />
  ),
);

TextareaBase.displayName = "TextareaBase";

const _Textarea: ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextareaProps
> = (
  { withUnderline = true, underlineColor, ...props }: TextareaProps,
  parentRef: ForwardedRef<HTMLTextAreaElement>,
) => {
  const newRef = useRef<HTMLTextAreaElement>(null);
  const ref = parentRef ?? newRef;

  return (
    <Focusable
      Component={TextareaBase}
      ref={ref}
      underlineColor={underlineColor}
      withUnderline={withUnderline}
      {...props}
    />
  );
};

export const Textarea = forwardRef(_Textarea);
