import { Action } from "redux";
import { Schema_SomedayEventsColumn } from "@web/common/types/web.event.types";

export interface Action_Someday_Reorder extends Action {
  payload: Payload_Someday_Reorder[];
}

interface Payload_Someday_Reorder {
  _id: string;
  order: number;
}

//++
interface _Payload_Someday_Reorder {
  origIndex: number;
  newIndex: number;
  reorderedEvent: string;
  somedayEvents: Schema_SomedayEventsColumn;
}
