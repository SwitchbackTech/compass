import { Action } from "redux";

export interface Action_Someday_Reorder extends Action {
  payload: Payload_Someday_Reorder[];
}

interface Payload_Someday_Reorder {
  _id: string;
  order: number;
}
