import { type Categories_Event } from "@core/types/event.types";
import {
  DateTimeSection,
  type Props as DateTimeSectionProps,
} from "../DateTimeSection/DateTimeSection";

interface Props {
  dateTimeSectionProps: DateTimeSectionProps;
  eventCategory: Categories_Event;
}

export const DateControlsSection = ({ dateTimeSectionProps }: Props) => {
  return (
    <div className="mt-[15px] mb-3 flex flex-wrap gap-2">
      <DateTimeSection {...dateTimeSectionProps} />
    </div>
  );
};
