import classNames from "classnames";
import {
  type ForwardedRef,
  type ForwardRefRenderFunction,
  forwardRef,
  useRef,
} from "react";
import TextareaAutoSize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";
import { Focusable } from "@web/components/Focusable/Focusable";

interface TextareaProps
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  heightFitsContent?: boolean;
}

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
        "resize-none border-0 outline-none placeholder:text-text-muted",
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
