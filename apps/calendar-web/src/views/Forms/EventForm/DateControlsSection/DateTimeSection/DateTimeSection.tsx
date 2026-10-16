import { type FC } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { DatePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers";
import { TimePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers";
import { type OpenDatePickerSide } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/useOpenDatePickerSide";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

export interface Props {
  datePickers: OpenDatePickerSide;
  displayEndDate: Date;
  draft: GridEventDraft;
  endTime: SelectOption<string>;
  onScheduleChange: OnEventFormScheduleChange;
  scheduleEnd: Date;
  scheduleStart: Date;
  selectedEndDate: Date;
  selectedStartDate: Date;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  datePickers,
  displayEndDate,
  draft,
  selectedEndDate,
  selectedStartDate,
  onScheduleChange,
  scheduleEnd,
  scheduleStart,
  startTime,
  endTime,
}) => {
  const isAllDay = draft.values.schedule.kind === "allDay";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {isAllDay && (
        <div className="flex items-center gap-2">
          <DatePickers
            datePickers={datePickers}
            displayEndDate={displayEndDate}
            draft={draft}
            selectedEndDate={selectedEndDate}
            selectedStartDate={selectedStartDate}
            onScheduleChange={onScheduleChange}
          />
        </div>
      )}

      {!isAllDay && (
        <TimePickers
          endTime={endTime}
          onScheduleChange={onScheduleChange}
          scheduleEnd={scheduleEnd}
          scheduleStart={scheduleStart}
          startTime={startTime}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
        />
      )}
    </div>
  );
};
