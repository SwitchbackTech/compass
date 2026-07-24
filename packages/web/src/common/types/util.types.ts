export interface TimeOption {
  label: string;
  value: string;
}

export type PartialMouseEvent = Pick<
  MouseEvent,
  "clientX" | "clientY" | "currentTarget"
>;
