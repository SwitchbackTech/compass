import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { colorByPriority } from "@web/common/styles/theme.util";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingTwoRowLayout } from "../../../components/layouts/OnboardingTwoRowLayout";
import { WeekHighlighter } from "../MigrationSandbox/WeekHighlighter";

const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  display: flex;
  margin: 20px;
  gap: 20px;
  z-index: 5;
  position: relative;
  overflow: visible;
  height: 580px;
`;

const TwoColumnContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  gap: 40px;
  padding: 20px;
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
`;

const EventContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EventItem = styled.div`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${colorByPriority.self};
  color: ${({ theme }) => theme.color.common.black};
  border-radius: 4px;
  padding: 12px;
  width: 280px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const EventText = styled.span`
  flex: 1;
`;

const EventArrows = styled.div`
  display: flex;
  gap: 4px;
`;

const MigrateArrow = styled.span`
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  user-select: none;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
  animation: pulse 2s ease-in-out infinite;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(96, 165, 250, 0.6);
  }

  &:active {
    background: rgba(0, 0, 0, 0.2);
    transform: scale(0.95);
  }
`;

export const MigrationIntro: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onNavigationControlChange,
  isNavPrevented = false,
}) => {
  const eventItemRef = useRef<HTMLDivElement>(null);
  const [arrowsPosition, setArrowsPosition] = useState({
    x: 200,
    y: 60,
    width: 60,
    height: 30,
  });

  useEffect(() => {
    const computeArrowsPosition = () => {
      if (!eventItemRef.current) return;

      const eventRect = eventItemRef.current.getBoundingClientRect();

      // Get the container element position to calculate relative coordinates
      const container = eventItemRef.current.closest(
        '[class*="MainContent"]',
      ) as HTMLElement;
      const containerRect = container?.getBoundingClientRect();
      if (!containerRect) return;

      // Find the arrows container within the event item
      const arrowsContainer = eventItemRef.current.querySelector(
        '[class*="EventArrows"]',
      ) as HTMLElement;
      if (!arrowsContainer) return;

      const arrowsRect = arrowsContainer.getBoundingClientRect();

      // Calculate position relative to MainContent container
      const arrowsX = arrowsRect.left - containerRect.left - 8;
      const arrowsY = arrowsRect.top - containerRect.top - 8;
      const arrowsWidth = arrowsRect.width + 16;
      const arrowsHeight = arrowsRect.height + 16;

      setArrowsPosition({
        x: arrowsX,
        y: arrowsY,
        width: arrowsWidth,
        height: arrowsHeight,
      });
    };

    // Slight delay to ensure layout is ready
    const timer = setTimeout(computeArrowsPosition, 100);

    // Recompute on resize for responsive behavior
    window.addEventListener("resize", computeArrowsPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeArrowsPosition);
    };
  }, []);
  const content = (
    <MainContent>
      <TwoColumnContainer>
        <LeftColumn>
          <EventContainer>
            <EventItem ref={eventItemRef}>
              <EventText>📚 Return library books</EventText>
              <EventArrows>
                <MigrateArrow>{"<"}</MigrateArrow>
                <MigrateArrow>{">"}</MigrateArrow>
              </EventArrows>
            </EventItem>
          </EventContainer>
        </LeftColumn>
        <RightColumn>
          <OnboardingText>Life at sea is unpredictable.</OnboardingText>
          <OnboardingText>
            Compass makes it easy to adjust your plans as things change.
          </OnboardingText>
          <OnboardingText>
            You can click one of the arrows to migrate the task forward or back
            a week/month.
          </OnboardingText>
          <OnboardingText>
            Let's go to the next screen to practice.
          </OnboardingText>
        </RightColumn>
      </TwoColumnContainer>
      <WeekHighlighter
        x={arrowsPosition.x}
        y={arrowsPosition.y}
        width={arrowsPosition.width}
        height={arrowsPosition.height}
        color="#6bffa6"
        strokeWidth={4}
        text=""
        onClick={() => {}}
      />
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
      onNavigationControlChange={onNavigationControlChange}
      isNavPrevented={isNavPrevented}
      isPrevBtnDisabled={true}
    />
  );
};
