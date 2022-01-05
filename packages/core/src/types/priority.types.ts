export interface PriorityReq {
  name: string;
  color: string;
}

export interface Schema_Priority extends PriorityReq {
  _id: string;
  user: string;
}
