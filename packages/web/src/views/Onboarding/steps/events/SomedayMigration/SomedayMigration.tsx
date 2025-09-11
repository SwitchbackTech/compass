import React from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
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
  const { monthTitle, weekDays, weeks, isCurrentWeekVisible } =
    useCalendarLogic();

  const content = (
    <MainContent>
      <Sidebar>
        <SidebarSection>
          <SectionTitle>This Week</SectionTitle>
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
          <CalendarGrid isCurrentWeek={isCurrentWeekVisible}>
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
