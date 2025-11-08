import React, { useEffect, useRef, useState } from "react";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Divider } from "@web/components/Divider";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import { WeekHighlighter } from "./WeekHighlighter";
import {
  CalendarDay,
  CalendarGrid,
  Checkbox,
  CheckboxContainer,
  CheckboxLabel,
  EventArrows,
  EventItem,
  EventList,
  EventText,
  MainContent,
  MiddleColumn,
  MigrateArrow,
  MonthHeader,
  MonthPicker,
  MonthTitle,
  RightColumn,
  SectionNavigationArrow,
  SectionNavigationArrows,
  SectionTitle,
  SectionTitleText,
  Sidebar,
  SidebarSection,
} from "./styled";
import { useMigrationLogic } from "./useMigrationLogic";
import { useMigrationSandbox } from "./useMigrationSandbox";

export const MigrationSandbox: React.FC<OnboardingStepProps> = ({
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
  } = useMigrationSandbox(
    () => setHasMigratedEvent(true),
    (eventName: string) => {
      setMigratedEventName(eventName);
      setShowMigratedEventEllipse(true);
      setShouldHighlightNavigation(true);
    },
    () => {
      setHasViewedNextWeek(true);
      setShouldHighlightNavigation(false); // Remove highlight once they navigate
    },
  );
  const {
    weeks,
    nextMonthWeeks,
    isCurrentWeekVisible,
    currentWeekIndex: calendarWeekIndex,
  } = useMigrationLogic();

  const thisWeekLabelRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const nextCalendarGridRef = useRef<HTMLDivElement>(null);
  const [ellipsePosition, setEllipsePosition] = useState({
    x: 280,
    y: 60,
    width: 280,
    height: 40,
  });
  const [nextMonthFirstWeekPosition, setNextMonthFirstWeekPosition] = useState({
    x: 280,
    y: 60,
    width: 280,
    height: 40,
  });
  const [hasMigratedEvent, setHasMigratedEvent] = useState(false);
  const [hasViewedNextWeek, setHasViewedNextWeek] = useState(false);
  const [hasMigratedMonthEvent, setHasMigratedMonthEvent] = useState(false);
  const [migratedEventName, setMigratedEventName] = useState<string | null>(
    null,
  );
  const [migratedMonthEventName, setMigratedMonthEventName] = useState<
    string | null
  >(null);
  const [showMigratedEventEllipse, setShowMigratedEventEllipse] =
    useState(false);
  const [showMonthMigratedEllipse, setShowMonthMigratedEllipse] =
    useState(false);
  const [shouldHighlightNavigation, setShouldHighlightNavigation] =
    useState(false);

  // Disable the footer's Next button until all steps are completed
  const isAllChecked =
    hasMigratedEvent && hasMigratedMonthEvent && hasViewedNextWeek;

  const [thisMonthEvents, setThisMonthEvents] = useState([
    { text: "🤖 Start AI course", color: colorByPriority.work },
    { text: "🏠 Book Airbnb", color: colorByPriority.relationships },
    { text: "📚 Return library books", color: colorByPriority.self },
  ] as { text: string; color: string }[]);
  const [nextMonthEventsList, setNextMonthEventsList] = useState<
    { text: string; color: string }[]
  >([]);

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

      // Compute rectangle for first week of the NEXT month widget
      if (nextCalendarGridRef.current) {
        const nextRect = nextCalendarGridRef.current.getBoundingClientRect();
        const totalWeeksNext = 5;
        const rowHeightNext = nextRect.height / totalWeeksNext;
        const colWidthNext = nextRect.width / 7;

        const nmX = nextRect.left - containerRect.left - 8;
        const nmY = nextRect.top - containerRect.top + 0 * rowHeightNext - 8;
        const nmWidth = 7 * colWidthNext + 16;
        const nmHeight = rowHeightNext + 16;

        setNextMonthFirstWeekPosition({
          x: nmX,
          y: nmY,
          width: nmWidth,
          height: nmHeight,
        });
      }
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
                $shouldHighlight={
                  shouldHighlightNavigation && currentWeekIndex === 0
                }
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
                    title="Migrate to previous week"
                  >
                    {"<"}
                  </MigrateArrow>
                  <MigrateArrow
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
                    title="Migrate to next week"
                  >
                    {">"}
                  </MigrateArrow>
                </EventArrows>
              </EventItem>
            ))}
          </EventList>
        </SidebarSection>
        <Divider />
        <SidebarSection>
          <SectionTitle>
            {currentWeekIndex === 0 ? "This Month" : "Next Month"}
          </SectionTitle>
          <EventList>
            {(currentWeekIndex === 0
              ? thisMonthEvents
              : nextMonthEventsList
            ).map((event, index) => (
              <EventItem key={`month-${index}`} color={event.color}>
                <EventText>{event.text}</EventText>
                <EventArrows>
                  <MigrateArrow
                    onClick={(e) => {
                      e.stopPropagation();
                      // No-op for back month migration
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        // No-op for back month migration
                      }
                    }}
                    role="button"
                    tabIndex={-1}
                    title="Migrate to previous month"
                  >
                    {"<"}
                  </MigrateArrow>
                  <MigrateArrow
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentWeekIndex === 0) {
                        setHasMigratedMonthEvent(true);
                        setShowMonthMigratedEllipse(true);
                        setMigratedMonthEventName(event.text);
                        // Remove from This Month and add to Next Month list
                        setThisMonthEvents((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                        setNextMonthEventsList((prev) => [...prev, event]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentWeekIndex === 0) {
                          setHasMigratedMonthEvent(true);
                          setShowMonthMigratedEllipse(true);
                          setMigratedMonthEventName(event.text);
                          setThisMonthEvents((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                          setNextMonthEventsList((prev) => [...prev, event]);
                        }
                      }
                    }}
                    role="button"
                    tabIndex={currentWeekIndex === 1 ? -1 : 0}
                    title="Migrate to next month"
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
          <MonthHeader>
            <MonthTitle>This Month</MonthTitle>
          </MonthHeader>
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
          {/* Spacer between months */}
          <div style={{ height: 8 }} />
          <MonthHeader>
            <MonthTitle>Next Month</MonthTitle>
          </MonthHeader>
          <CalendarGrid isCurrentWeek={false} ref={nextCalendarGridRef}>
            {nextMonthWeeks.map((week, weekIndex) =>
              week.days.map((day, dayIndex) => (
                <CalendarDay
                  key={`n-${weekIndex}-${dayIndex}`}
                  isCurrentWeek={false}
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
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="migrate-event"
            checked={hasMigratedEvent}
            readOnly
          />
          <CheckboxLabel htmlFor="migrate-event">
            Migrate an event to next week
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="migrate-month-event"
            checked={hasMigratedMonthEvent}
            readOnly
          />
          <CheckboxLabel htmlFor="migrate-month-event">
            Migrate an event to next month
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="view-next-week"
            checked={hasViewedNextWeek}
            readOnly
          />
          <CheckboxLabel htmlFor="view-next-week">
            Go to next week/month
          </CheckboxLabel>
        </CheckboxContainer>
      </RightColumn>
      {isCurrentWeekVisible && (
        <>
          <WeekHighlighter
            x={ellipsePosition.x}
            y={ellipsePosition.y}
            width={ellipsePosition.width}
            height={ellipsePosition.height}
            color="#6ba6ff"
            strokeWidth={3}
            text=""
            onClick={() => {}}
          />
          <div
            style={{
              position: "absolute",
              left: `${ellipsePosition.x + ellipsePosition.width + 20}px`,
              top: `${ellipsePosition.y + ellipsePosition.height / 2 - 10}px`,
              fontFamily: "Caveat, cursive",
              fontSize: "18px",
              color: "#60a5fa",
              fontWeight: "normal",
              zIndex: 101,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            This week (pretend)
          </div>
        </>
      )}
      {showMigratedEventEllipse && calendarGridRef.current && (
        <WeekHighlighter
          x={ellipsePosition.x}
          y={
            ellipsePosition.y +
            calendarGridRef.current.getBoundingClientRect().height / 5
          }
          width={ellipsePosition.width}
          height={ellipsePosition.height}
          color="#60e3fa"
          strokeWidth={3}
          text=""
          onClick={() => {}}
        />
      )}
      {showMonthMigratedEllipse && nextCalendarGridRef.current && (
        <WeekHighlighter
          x={nextMonthFirstWeekPosition.x}
          y={nextMonthFirstWeekPosition.y}
          width={nextMonthFirstWeekPosition.width}
          height={nextMonthFirstWeekPosition.height}
          color="#60e3fa"
          strokeWidth={3}
          text=""
          onClick={() => {}}
        />
      )}
      {showMonthMigratedEllipse && migratedMonthEventName && (
        <div
          style={{
            position: "absolute",
            left: `${nextMonthFirstWeekPosition.x + nextMonthFirstWeekPosition.width + 20}px`,
            top: `${nextMonthFirstWeekPosition.y + nextMonthFirstWeekPosition.height / 2 - 10}px`,
            fontFamily: "Caveat, cursive",
            fontSize: "18px",
            color: "#60e3fa",
            fontWeight: "normal",
            zIndex: 101,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {migratedMonthEventName} is here now
        </div>
      )}
      {showMigratedEventEllipse &&
        migratedEventName &&
        calendarGridRef.current && (
          <div
            style={{
              position: "absolute",
              left: `${ellipsePosition.x + ellipsePosition.width + 20}px`,
              top: `${ellipsePosition.y + calendarGridRef.current.getBoundingClientRect().height / 5 + ellipsePosition.height / 2 - 10}px`,
              fontFamily: "Caveat, cursive",
              fontSize: "18px",
              color: "#60e3fa", // Match rectangle color
              fontWeight: "normal",
              zIndex: 101,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {migratedEventName} is here now
          </div>
        )}
    </MainContent>
  );

  return (
    <OnboardingTwoRowLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={isAllChecked ? onNext : () => {}}
      onPrevious={onPrevious}
      onSkip={onSkip}
      content={content}
      isNextBtnDisabled={!isAllChecked}
      onNavigationControlChange={onNavigationControlChange}
      isNavPrevented={!isAllChecked || isNavPrevented}
    />
  );
};
