import styled from "styled-components";

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
  FLEX_END = "flex-end",
  FLEX_START = "flex-start",
}

export enum FlexWrap {
  WRAP = "wrap",
  NO_WRAP = "no-wrap",
  WRAP_REVERSE = "wrap-reverse",
}

export interface Props {
  direction?: FlexDirections;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexWrap?: FlexWrap;
}

export const Styled = styled.div<Props>`
  align-items: ${({ alignItems }) => alignItems || "start"};
  display: flex;
  flex-direction: ${({ direction }) => direction || "row"};
  flex-wrap: ${({ flexWrap }) => flexWrap || "nowrap"};
  justify-content: ${({ justifyContent }) => justifyContent || "start"};
`;
