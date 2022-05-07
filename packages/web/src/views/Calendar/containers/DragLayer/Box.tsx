import React from "react";
import type { CSSProperties, FC } from "react";
import { memo } from "react";

const styles: CSSProperties = {
  border: "1px solid black",
  padding: "0.5rem 1rem",
  cursor: "move",
};

export interface BoxProps {
  title?: string;
  yellow?: boolean;
  preview?: boolean;
}

export const Box: FC<BoxProps> = memo(function Box({ yellow, preview }) {
  const backgroundColor = yellow ? "yellow" : "white";
  console.log("rendering box");
  return (
    <div
      style={{ ...styles, backgroundColor }}
      //   role={preview ? "BoxPreview" : "Box"}
    >
      no title big h1 yo yo
    </div>
  );
});
