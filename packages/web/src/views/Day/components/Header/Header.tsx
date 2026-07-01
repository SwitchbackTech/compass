import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { CalendarHeader } from "@web/components/CalendarHeader/CalendarHeader";
import { Text } from "@web/components/Text/Text";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";

const DAY_LABEL_FORMAT = "dddd, MMMM D";

interface Props {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: FC<Props> = ({
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const dateInView = useDateInView();
  const { navigateToPreviousDay, navigateToNextDay, navigateToToday } =
    useDateNavigation();

  const label = dateInView.locale("en").format(DAY_LABEL_FORMAT);
  const isToday = dateInView.isSame(dayjs(), "day");

  return (
    <CalendarHeader
      label={
        <h1 className="pl-5 text-text-light" aria-live="polite">
          <Text size="xl">{label}</Text>
        </h1>
      }
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => onToggleSidebar?.()}
      onPrev={navigateToPreviousDay}
      onNext={navigateToNextDay}
      onToday={navigateToToday}
      isToday={isToday}
      prevLabel="Previous day"
      nextLabel="Next day"
    />
  );
};
