import { FC, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { theme } from "@web/common/styles/theme";
import { getCalendarHeadingLabel } from "@web/common/utils/datetime/web.date.util";
import { AlignItems } from "@web/components/Flex/styled";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { RootProps } from "../../calendarView.types";
import { Util_Scroll } from "../../hooks/grid/useScroll";
import { useReminderHotkey } from "../../hooks/shortcuts/useFocusHotkey";
import { WeekProps } from "../../hooks/useWeek";
import { TodayButton } from "../TodayButton/TodayButton";
import { DayLabels } from "./DayLabels";
import { Reminder } from "./Reminder/Reminder";
import {
  ArrowNavigationButton,
  StyledHeaderLabel,
  StyledHeaderRow,
  StyledLeftGroup,
  StyledNavigationArrows,
  StyledNavigationGroup,
  StyledRightGroup,
} from "./styled";

interface Props {
  rootProps: RootProps;
  scrollUtil: Util_Scroll;
  today: Dayjs;
  weekProps: WeekProps;
}
export const Header: FC<Props> = ({ scrollUtil, today, weekProps }) => {
  const { scrollToNow } = scrollUtil;

  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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

  const reminderRef = useRef<HTMLDivElement>(null);

  useReminderHotkey(() => reminderRef.current?.focus(), [reminderRef]);

  return (
    <>
      <StyledHeaderRow alignItems={AlignItems.BASELINE}>
        <TooltipWrapper
          description={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          onClick={() => dispatch(viewSlice.actions.toggleSidebar())}
          shortcut="["
        >
          <SidebarIcon
            color={
              isSidebarOpen
                ? theme.color.text.light
                : theme.color.text.lightInactive
            }
          />
        </TooltipWrapper>
        <StyledLeftGroup>
          <StyledHeaderLabel aria-level={1} role="heading">
            <Text size="xl">{headerLabel}</Text>
          </StyledHeaderLabel>
        </StyledLeftGroup>
        <Reminder ref={reminderRef} />
        <StyledRightGroup>
          <SelectView
            onSelectNow={() => navigate(ROOT_ROUTES.NOW)}
            onSelectDay={() => navigate(ROOT_ROUTES.DAY)}
            onSelectWeek={() => navigate(ROOT_ROUTES.ROOT)}
          />
          <div>
            <StyledNavigationGroup>
              <TodayButton
                navigateToToday={onTodayClick}
                isToday={weekProps.component.isCurrentWeek}
              />
              <StyledNavigationArrows>
                <TooltipWrapper
                  onClick={() => weekProps.util.decrementWeek()}
                  shortcut="J"
                >
                  <ArrowNavigationButton
                    cursor="pointer"
                    role="navigation"
                    size="xxl"
                    title="previous week"
                  >
                    {"<"}
                  </ArrowNavigationButton>
                </TooltipWrapper>

                <TooltipWrapper
                  onClick={() => weekProps.util.incrementWeek()}
                  shortcut="K"
                >
                  <ArrowNavigationButton
                    cursor="pointer"
                    role="navigation"
                    size="xxl"
                    title="next week"
                  >
                    {">"}
                  </ArrowNavigationButton>
                </TooltipWrapper>
              </StyledNavigationArrows>
            </StyledNavigationGroup>
          </div>
        </StyledRightGroup>
      </StyledHeaderRow>

      <DayLabels
        startOfView={weekProps.component.startOfView}
        today={today}
        week={weekProps.component.week}
        weekDays={weekProps.component.weekDays}
      />
    </>
  );
};
