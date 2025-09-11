import React, { useEffect, useRef, useState } from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import { WeekHighlighter } from "./WeekHighlighter";
import {
  CalendarDay,
  CalendarGrid,
  EventArrows,
  EventItem,
  EventList,
  EventText,
  MainContent,
  MiddleColumn,
  MigrateArrow,
  MonthPicker,
  RightColumn,
  SectionNavigationArrow,
  SectionNavigationArrows,
  SectionTitle,
  SectionTitleText,
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
  const {
    somedayEvents,
    weekLabel,
    currentWeekIndex,
    canNavigateBack,
    canNavigateForward,
    navigateToNextWeek,
    navigateToPreviousWeek,
    handleEventClick,
  } = useSomedayMigration();
  const {
    weekDays,
    weeks,
    isCurrentWeekVisible,
    currentWeekIndex: calendarWeekIndex,
  } = useCalendarLogic();

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
      if (!calendarGridRef.current || calendarWeekIndex === -1) return;

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

      // Include all days in the current week for the ellipse
      const thisWeek = weeks[calendarWeekIndex];
      const currentWeekDayIndices = thisWeek.days
        .map((d, idx) => ({ idx, isCurrentWeek: d.isCurrentWeek }))
        .filter((x) => x.isCurrentWeek)
        .map((x) => x.idx);

      const firstIdx = currentWeekDayIndices.length
        ? Math.min(...currentWeekDayIndices)
        : 0;
      const lastIdx = currentWeekDayIndices.length
        ? Math.max(...currentWeekDayIndices)
        : 6;

      const ellipseX =
        calendarGridRect.left - containerRect.left + firstIdx * colWidth - 8;
      const ellipseY =
        calendarGridRect.top -
        containerRect.top +
        calendarWeekIndex * currentWeekRowHeight -
        8;
      const ellipseWidth = (lastIdx - firstIdx + 1) * colWidth + 16;
      const ellipseHeight = currentWeekRowHeight + 16;

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
  }, [calendarWeekIndex, isCurrentWeekVisible, weeks]);

  const content = (
    <MainContent>
      <Sidebar>
        <SidebarSection>
          <SectionTitle ref={thisWeekLabelRef}>
            <SectionTitleText>{weekLabel}</SectionTitleText>
            <SectionNavigationArrows>
              <SectionNavigationArrow
                disabled={!canNavigateBack}
                onClick={navigateToPreviousWeek}
                title="Previous week"
                aria-label="Navigate to previous week"
              >
                {"<"}
              </SectionNavigationArrow>
              <SectionNavigationArrow
                disabled={!canNavigateForward}
                onClick={navigateToNextWeek}
                title="Next week"
                aria-label="Navigate to next week"
              >
                {">"}
              </SectionNavigationArrow>
            </SectionNavigationArrows>
          </SectionTitle>
          <EventList>
            {somedayEvents.map((event, index) => (
              <EventItem
                key={index}
                color={event.color}
                role="button"
                tabIndex={0}
              >
                <EventText>{event.text}</EventText>
                <EventArrows>
                  <MigrateArrow
                    disabled={currentWeekIndex === 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentWeekIndex !== 1) {
                        handleEventClick(event.text, index, "back");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentWeekIndex !== 1) {
                          handleEventClick(event.text, index, "back");
                        }
                      }
                    }}
                    role="button"
                    tabIndex={currentWeekIndex === 1 ? -1 : 0}
                    title={
                      currentWeekIndex === 1
                        ? "Cannot migrate further back"
                        : "Migrate to previous week"
                    }
                  >
                    {"<"}
                  </MigrateArrow>
                  <MigrateArrow
                    disabled={currentWeekIndex === 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentWeekIndex !== 1) {
                        handleEventClick(event.text, index, "forward");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentWeekIndex !== 1) {
                          handleEventClick(event.text, index, "forward");
                        }
                      }
                    }}
                    role="button"
                    tabIndex={currentWeekIndex === 1 ? -1 : 0}
                    title={
                      currentWeekIndex === 1
                        ? "Cannot migrate further forward"
                        : "Migrate to next week"
                    }
                  >
                    {">"}
                  </MigrateArrow>
                </EventArrows>
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
