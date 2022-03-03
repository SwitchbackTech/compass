export interface PriorityReq {
  name: string;
  color: string;
}
export interface Schema_Priority extends PriorityReq {
  _id: string;
  user: string;
}
export declare enum Priorities {
  WORK = "work",
  SELF = "self",
  RELATIONS = "relations",
}
//# sourceMappingURL=priority.types.d.ts.map
