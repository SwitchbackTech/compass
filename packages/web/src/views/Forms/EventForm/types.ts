import { KeyboardEvent, SetStateAction } from "react";
import { Priority } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

/**
 * Time selection option type
 */
export interface TimeOption {
  label: string;
  value: string;
}

/**
 * Props interface for form components
 */
export interface FormProps {
  event: Schema_Event;
  isOpen?: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert?: () => void;
  onDelete?: (eventId?: string) => void;
  onDuplicate?: (event: Schema_Event) => void;
  onSubmit: (event?: Schema_Event) => void;
  onSubmitEventForm?: (event: Schema_Event) => void;
  priority?: Priority;
  setEvent: (event: Schema_Event) => SetStateAction<Schema_Event> | void;
}

/**
 * Fields that can be updated in an event
 */
export type EventField = keyof Pick<
  Schema_Event,
  "title" | "description" | "startDate" | "endDate" | "priority"
>;

/**
 * Function type for setting event fields
 */
export type SetEventFormField = (field: Partial<Schema_Event> | null) => void;

/**
 * Props for the PrioritySection component
 */
export interface PrioritySectionProps {
  onSetEventField: SetEventFormField;
  priority: Priority;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * Date/Time section props with improved type safety
 */
export interface DateTimeSectionProps {
  bgColor: string;
  displayEndDate: Date;
  event: Schema_Event;
  category: string;
  endTime: TimeOption;
  inputColor: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  onSetEventField: SetEventFormField;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setEndTime: (time: TimeOption) => void;
  setSelectedEndDate: (date: Date) => void;
  setSelectedStartDate: (date: Date) => void;
  setStartTime: (time: TimeOption) => void;
  startTime: TimeOption;
  setDisplayEndDate: (date: Date) => void;
  setIsEndDatePickerOpen: (isOpen: boolean) => void;
  setIsStartDatePickerOpen: (isOpen: boolean) => void;
  setEvent: FormProps["setEvent"];
}

/**
 * Props for the RecurrenceSection component
 */
export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  startTime: TimeOption;
  endTime: TimeOption;
  onSetEventField?: SetEventFormField;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * Props for the DateControlsSection component
 */
export interface DateControlsSectionProps {
  dateTimeSectionProps: DateTimeSectionProps;
  eventCategory: string;
  recurrenceSectionProps: RecurrenceSectionProps;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * Props for styled form components
 */
export interface StyledFormProps {
  isOpen?: boolean;
  priority?: Priority;
  title?: string;
}
