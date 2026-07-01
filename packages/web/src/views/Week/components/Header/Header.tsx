import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { getCalendarHeadingLabel } from "@web/common/utils/datetime/web.date.util";
import { CalendarHeader } from "@web/components/CalendarHeader/CalendarHeader";
import { type Util_Scroll } from "../../hooks/grid/useScroll";
import { type WeekProps } from "../../hooks/useWeek";

interface Props {
  scrollUtil: Util_Scroll;
  weekProps: WeekProps;
}
export const Header: FC<Props> = ({ scrollUtil, weekProps }) => {
  const { scrollToNow } = scrollUtil;

  const headerLabel = getCalendarHeadingLabel(
    weekProps.component.startOfView,
    weekProps.component.endOfView,
    dayjs(),
  );

  const onTodayClick = () => {
    if (!weekProps.component.isCurrentWeek) {
      weekProps.util.goToToday();
    }
    scrollToNow();
  };

  return (
    <CalendarHeader
      label={headerLabel}
      onPrev={() => weekProps.util.decrementWeek()}
      onNext={() => weekProps.util.incrementWeek()}
      onToday={onTodayClick}
      isToday={weekProps.component.isCurrentWeek}
      prevLabel="Previous week"
      nextLabel="Next week"
    />
  );
};
