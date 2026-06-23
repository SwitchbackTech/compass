import classNames from "classnames";
import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";

export enum FlexDirections {
  COLUMN = "column",
  COLUMN_REVERSE = "column-reverse",
  ROW = "row",
  ROW_REVERSE = "row-reverse",
}

export enum JustifyContent {
  CENTER = "center",
  LEFT = "left",
  SPACE_BETWEEN = "space-between",
  SPACE_AROUND = "space-around",
}

export enum AlignItems {
  CENTER = "center",
  BASELINE = "baseline",
  FLEX_END = "flex-end",
  FLEX_START = "flex-start",
}

export enum FlexWrap {
  WRAP = "wrap",
  NO_WRAP = "no-wrap",
  WRAP_REVERSE = "wrap-reverse",
}

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: FlexDirections;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexWrap?: FlexWrap;
}

const directionClasses: Record<FlexDirections, string> = {
  [FlexDirections.COLUMN]: "flex-col",
  [FlexDirections.COLUMN_REVERSE]: "flex-col-reverse",
  [FlexDirections.ROW]: "flex-row",
  [FlexDirections.ROW_REVERSE]: "flex-row-reverse",
};

const justifyClasses: Record<JustifyContent, string> = {
  [JustifyContent.CENTER]: "justify-center",
  [JustifyContent.LEFT]: "justify-start",
  [JustifyContent.SPACE_BETWEEN]: "justify-between",
  [JustifyContent.SPACE_AROUND]: "justify-around",
};

const alignClasses: Record<AlignItems, string> = {
  [AlignItems.CENTER]: "items-center",
  [AlignItems.BASELINE]: "items-baseline",
  [AlignItems.FLEX_END]: "items-end",
  [AlignItems.FLEX_START]: "items-start",
};

const wrapClasses: Record<FlexWrap, string> = {
  [FlexWrap.WRAP]: "flex-wrap",
  [FlexWrap.NO_WRAP]: "flex-nowrap",
  [FlexWrap.WRAP_REVERSE]: "flex-wrap-reverse",
};

export const Flex = forwardRef<HTMLDivElement, PropsWithChildren<FlexProps>>(
  (
    { alignItems, className, direction, flexWrap, justifyContent, ...props },
    ref,
  ) => (
    <div
      {...props}
      className={classNames(
        "flex",
        alignItems ? alignClasses[alignItems] : "items-start",
        direction ? directionClasses[direction] : "flex-row",
        flexWrap ? wrapClasses[flexWrap] : "flex-nowrap",
        justifyContent ? justifyClasses[justifyContent] : "justify-start",
        className,
      )}
      ref={ref}
    />
  ),
);

Flex.displayName = "Flex";
