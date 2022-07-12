import { MutableRefObject } from "react";

export interface GridPosition {
  height: number;
  left: number;
  top: number;
  width: number;
}

export type Ref_Grid = MutableRefObject<HTMLDivElement>;
