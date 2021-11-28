export enum Priorities {
  WORK = 'work',
  SELF = 'self',
  RELATIONS = 'relations',
}

export interface EventEntity {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: Priorities;
  id?: string;
  isTimeSelected?: boolean;
  showStartTimeLabel?: boolean;
  allDay?: boolean;
  allDayOrder?: number;
  groupOrder?: number;
  groupCount?: number;
  order?: number;
}

export type NormalizedAsyncActionPayload<T = string> = T[];
