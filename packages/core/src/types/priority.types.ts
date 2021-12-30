export interface PriorityReq {
  name: string;
  color: string;
}

export interface Priority extends PriorityReq {
  _id: string;
  user: string;
}
