import classNames from "classnames";
import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";
import { type CSSVariables } from "@web/common/styles/css.types";
import { getGradient } from "@web/common/styles/theme.util";

type FontSize = "xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl" | "4xl" | "5xl";

export interface TextProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  withBottomBorder?: boolean;
  color?: string;
  cursor?: string;
  fontWeight?: number | "normal" | "bold" | "bolder" | "lighter";
  lineHeight?: number;
  size?: FontSize;
  withGradient?: boolean;
  withUnderline?: boolean;
  zIndex?: number;
}

const sizeClasses: Record<FontSize, string> = {
  xs: "text-xs",
  s: "text-s",
  m: "text-m",
  l: "text-l",
  xl: "text-xl",
  xxl: "text-xxl",
  xxxl: "text-xxxl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

export const Text = forwardRef<HTMLSpanElement, PropsWithChildren<TextProps>>(
  (
    {
      className,
      color,
      cursor,
      fontWeight = "normal",
      lineHeight,
      size,
      style,
      withBottomBorder,
      withGradient,
      withUnderline = false,
      zIndex,
      ...props
    },
    ref,
  ) => {
    const textStyle: CSSVariables = {
      ...style,
      "--text-underline-gradient": getGradient(color ?? ""),
      color,
      cursor: (withUnderline
        ? (cursor ?? "pointer")
        : cursor) as CSSVariables["cursor"],
      fontWeight,
      lineHeight: lineHeight ? `${lineHeight}px` : undefined,
      zIndex,
    };

    return (
      <span
        {...props}
        className={classNames(
          "relative",
          size && sizeClasses[size],
          withBottomBorder && "border-text-divider border-b",
          withGradient && "c-text-gradient",
          withUnderline && "c-text-underline",
          className,
        )}
        ref={ref}
        style={textStyle}
      />
    );
  },
);

Text.displayName = "Text";
