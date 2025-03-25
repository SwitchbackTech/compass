import { gSchema$Event } from "@core/types/gcal";

export type Scenario =
  | "REGULAR_EVENT"
  | "NEW_RECURRING"
  | "SINGLE_INSTANCE"
  | "THIS_AND_FUTURE"
  | "ALL_INSTANCES";

export interface ScenarioAnalysis {
  scenario: Scenario;
  baseEvent?: gSchema$Event;
  modifiedInstance?: gSchema$Event;
  newBaseEvent?: gSchema$Event;
}
