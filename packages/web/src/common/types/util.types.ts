export interface AssignResult {
  fits: boolean;
  rowNum?: number;
}
export interface WidthPercentages {
  current: number[];
  pastFuture: number[];
}

export interface WidthPixels {
  current: {
    sidebarOpen: number[];
    sidebarClosed: number[];
  };
  pastFuture: {
    sidebarOpen: number;
    sidebarClosed: number;
  };
}

export type Ref_Callback = (node: HTMLDivElement) => void;
