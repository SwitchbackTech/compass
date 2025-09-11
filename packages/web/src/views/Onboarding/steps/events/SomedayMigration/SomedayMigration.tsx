import React, { useEffect, useRef, useState } from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import { HandDrawnArrow } from "./HandDrawnArrow";
import {
  CalendarDay,
  CalendarGrid,
  EventItem,
  EventList,
  MainContent,
  MiddleColumn,
  MonthHeader,
  MonthPicker,
  MonthTitle,
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
  const {
    monthTitle,
    weekDays,
    weeks,
    isCurrentWeekVisible,
    currentWeekIndex,
  } = useCalendarLogic();

  const thisWeekLabelRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const [arrowPosition, setArrowPosition] = useState({ x: 280, y: 60 });

  useEffect(() => {
    // Add a small delay to ensure DOM elements are fully rendered
    const timer = setTimeout(() => {
      if (
        thisWeekLabelRef.current &&
        calendarGridRef.current &&
        currentWeekIndex !== -1
      ) {
        // Get the "This Week" label position
        const thisWeekRect = thisWeekLabelRef.current.getBoundingClientRect();
        const calendarGridRect =
          calendarGridRef.current.getBoundingClientRect();

        // Get the container element position to calculate relative coordinates
        const container = thisWeekLabelRef.current.closest(
          '[class*="MainContent"]',
        ) as HTMLElement;
        const containerRect = container?.getBoundingClientRect();

        if (containerRect) {
          // Calculate relative positions within the container
          const startX = thisWeekRect.right - containerRect.left + 10; // Start from the end of "This Week" label
          const startY =
            thisWeekRect.top + thisWeekRect.height / 2 - containerRect.top; // Middle of the label

          // Calculate the target position (current week row in calendar)
          const currentWeekRowHeight = calendarGridRect.height / 5; // 5 weeks in calendar
          const currentWeekY =
            calendarGridRect.top -
            containerRect.top +
            currentWeekIndex * currentWeekRowHeight +
            currentWeekRowHeight / 2;

          const newPosition = { x: startX, y: startY };
          setArrowPosition(newPosition);
        }
      }
    }, 100); // 100ms delay

    return () => clearTimeout(timer);
  }, [currentWeekIndex, isCurrentWeekVisible]);

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
          <MonthHeader>
            <MonthTitle>{monthTitle}</MonthTitle>
          </MonthHeader>
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
        <HandDrawnArrow
          x={arrowPosition.x}
          y={arrowPosition.y}
          width={80}
          height={40}
          color="#ff6b6b"
          strokeWidth={3}
          onClick={() => console.log("Hand-drawn arrow clicked!")}
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
