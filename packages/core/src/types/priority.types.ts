export interface PriorityReq {
  name: string;
}

export interface Schema_Priority extends PriorityReq {
  _id: string;
  user: string;
}

export enum Priorities {
  WORK = "work",
  SELF = "self",
  RELATIONS = "relations",
}
