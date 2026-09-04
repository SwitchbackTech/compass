export type GraphDayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type GraphRecurrencePatternType =
  | "daily"
  | "weekly"
  | "absoluteMonthly"
  | "relativeMonthly"
  | "absoluteYearly"
  | "relativeYearly";

export type GraphWeekIndex = "first" | "second" | "third" | "fourth" | "last";

export type GraphRecurrenceRangeType = "noEnd" | "endDate" | "numbered";

export interface GraphRecurrencePattern {
  readonly type: GraphRecurrencePatternType;
  readonly interval: number;
  readonly dayOfMonth?: number;
  readonly daysOfWeek?: readonly GraphDayOfWeek[];
  readonly firstDayOfWeek?: GraphDayOfWeek;
  readonly index?: GraphWeekIndex;
  readonly month?: number;
}

export interface GraphRecurrenceRange {
  readonly type: GraphRecurrenceRangeType;
  readonly startDate: string;
  readonly endDate?: string;
  readonly numberOfOccurrences?: number;
  readonly recurrenceTimeZone?: string;
}

export interface GraphPatternedRecurrence {
  readonly pattern: GraphRecurrencePattern;
  readonly range: GraphRecurrenceRange;
}

export interface MicrosoftRecurrenceWriteContext {
  /** Event start date in YYYY-MM-DD form. */
  readonly startDate: string;
  /** IANA zone for the series when Graph needs recurrenceTimeZone. */
  readonly ianaTimeZone?: string;
}
