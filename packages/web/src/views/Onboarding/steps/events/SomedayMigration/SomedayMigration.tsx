import React, { useEffect, useRef, useState } from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import { WeekHighlighter } from "./WeekHighlighter";
import {
  CalendarDay,
  CalendarGrid,
  EventItem,
  EventList,
  MainContent,
  MiddleColumn,
  MonthPicker,
  RightColumn,
  SectionTitle,
  Sidebar,
  SidebarSection,
  WeekDayLabel,
  WeekDays,
} from "./styled";
import { useCalendarLogic } from "./useCalendarLogic";
import { useSomedayMigration } from "./useSomedayMigration";

export const SomedayMigration: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onNavigationControlChange,
  isNavPrevented = false,
}) => {
  const { somedayEvents, handleEventClick } = useSomedayMigration();
  const { weekDays, weeks, isCurrentWeekVisible, currentWeekIndex } =
    useCalendarLogic();

  const thisWeekLabelRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const [ellipsePosition, setEllipsePosition] = useState({
    x: 280,
    y: 60,
    width: 280,
    height: 40,
  });

  useEffect(() => {
    const computeEllipse = () => {
      if (!calendarGridRef.current || currentWeekIndex === -1) return;

      const calendarGridRect = calendarGridRef.current.getBoundingClientRect();

      // Get the container element position to calculate relative coordinates
      const container = calendarGridRef.current.closest(
        '[class*="MainContent"]',
      ) as HTMLElement;
      const containerRect = container?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate geometry
      const totalWeeks = 5; // calendar uses 5 rows
      const currentWeekRowHeight = calendarGridRect.height / totalWeeks;
      const colWidth = calendarGridRect.width / 7;

      // Narrow ellipse to only the current month's day columns within current week
      const thisWeek = weeks[currentWeekIndex];
      const indicesInMonth = thisWeek.days
        .map((d, idx) => ({ idx, inMonth: d.isCurrentMonth }))
        .filter((x) => x.inMonth)
        .map((x) => x.idx);

      const firstIdx = indicesInMonth.length ? Math.min(...indicesInMonth) : 0;
      const lastIdx = indicesInMonth.length ? Math.max(...indicesInMonth) : 6;

      const ellipseX =
        calendarGridRect.left - containerRect.left + firstIdx * colWidth - 5;
      const ellipseY =
        calendarGridRect.top -
        containerRect.top +
        currentWeekIndex * currentWeekRowHeight -
        5;
      const ellipseWidth = (lastIdx - firstIdx + 1) * colWidth + 10;
      const ellipseHeight = currentWeekRowHeight + 10;

      setEllipsePosition({
        x: ellipseX,
        y: ellipseY,
        width: ellipseWidth,
        height: ellipseHeight,
      });
    };

    // Slight delay to ensure layout is ready
    const timer = setTimeout(computeEllipse, 100);

    // Recompute on resize for responsive behavior
    window.addEventListener("resize", computeEllipse);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeEllipse);
    };
  }, [currentWeekIndex, isCurrentWeekVisible, weeks]);

  const content = (
    <MainContent>
      <Sidebar>
        <SidebarSection>
          <SectionTitle ref={thisWeekLabelRef}>This Week</SectionTitle>
          <EventList>
            {somedayEvents.map((event, index) => (
              <EventItem
                key={index}
                color={event.color}
                onClick={() => handleEventClick(event.text, index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleEventClick(event.text, index);
                  }
                }}
              >
                {event.text}
              </EventItem>
            ))}
          </EventList>
        </SidebarSection>
      </Sidebar>
      <MiddleColumn>
        <MonthPicker>
          <WeekDays isCurrentWeek={isCurrentWeekVisible}>
            {weekDays.map((day, index) => (
              <WeekDayLabel key={index} isCurrentWeek={isCurrentWeekVisible}>
                {day}
              </WeekDayLabel>
            ))}
          </WeekDays>
          <CalendarGrid
            ref={calendarGridRef}
            isCurrentWeek={isCurrentWeekVisible}
          >
            {weeks.map((week, weekIndex) =>
              week.days.map((day, dayIndex) => (
                <CalendarDay
                  key={`${weekIndex}-${dayIndex}`}
                  isCurrentWeek={day.isCurrentWeek}
                  isToday={day.isToday}
                >
                  {day.isCurrentMonth ? day.day : ""}
                </CalendarDay>
              )),
            )}
          </CalendarGrid>
        </MonthPicker>
      </MiddleColumn>
      <RightColumn>
        <OnboardingText>
          Click on any event to migrate it to next week or month
        </OnboardingText>
        <OnboardingText>
          This is how you'll manage your someday events in the real app
        </OnboardingText>
        <OnboardingText>
          Try clicking on the events in the sidebar to see them in action
        </OnboardingText>
      </RightColumn>
      {isCurrentWeekVisible && (
        <WeekHighlighter
          x={ellipsePosition.x}
          y={ellipsePosition.y}
          width={ellipsePosition.width}
          height={ellipsePosition.height}
          color="#ff6b6b"
          strokeWidth={3}
          text="We're here"
          onClick={() => console.log("Week highlighter clicked!")}
        />
      )}
    </MainContent>
  );

  return (
    <OnboardingTwoRowLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      content={content}
      nextButtonDisabled={false}
      onNavigationControlChange={onNavigationControlChange}
      isNavPrevented={isNavPrevented}
    />
  );
};
