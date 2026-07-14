import { type Categories_Event } from "@web/common/types/web.event.types";
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
    <div className="flex flex-wrap">
      <DateTimeSection {...dateTimeSectionProps} />
    </div>
  );
};
