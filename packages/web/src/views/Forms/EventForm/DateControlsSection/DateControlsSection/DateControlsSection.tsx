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
    <div className="mt-3.75 mb-3 flex flex-wrap">
      <DateTimeSection {...dateTimeSectionProps} />
    </div>
  );
};
