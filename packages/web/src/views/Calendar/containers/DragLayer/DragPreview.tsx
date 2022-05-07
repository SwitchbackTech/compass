import React from "react";
import type { FC } from "react";
import { memo } from "react";

import { Box } from "./Box";

export interface DragPreviewProps {}

export const DragPreview: FC<DragPreviewProps> = memo(function DragPreview({
  title,
}) {
  console.log("DragPreview");
  return (
    <div style={{ display: "inline-block" }}>
      <Box yellow={true} preview />
    </div>
  );
});
