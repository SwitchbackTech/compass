import React from "react";
import styled from "styled-components";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { OnboardingFooter, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingStepBoilerplate } from "../../components/OnboardingStepBoilerplate";

const CalendarContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ReminderText = styled(OnboardingText)`
  font-size: ${({ theme }) => theme.text.size["5xl"]};
  color: ${({ theme }) => theme.color.text.light};
  font-family: "Caveat", cursive;
  font-style: italic;
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.l};
  color: #40b7f6;
`;

export const SetReminderSuccess: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const reminder = localStorage.getItem(STORAGE_KEYS.REMINDER) as string;

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>Excellent choice.</OnboardingText>

      <OnboardingText>
        Compass will display this reminder above your calendar.
      </OnboardingText>

      <OnboardingText>
        As long as you’re here, you’ll never forget what matters most.
      </OnboardingText>

      <MockCalendar reminder={reminder} />

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};

const MockCalendar = ({ reminder }: { reminder: string }) => {
  return (
    <CalendarContainer>
      <ReminderText>{reminder}</ReminderText>

      <EventsSVG />
    </CalendarContainer>
  );
};

const EventsSVG = () => {
  return (
    <svg
      width="312"
      height="114"
      viewBox="0 0 312 114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: "scale(1.3)",
      }}
    >
      <g filter="url(#filter0_f_4075_12962)">
        <g clipPath="url(#clip0_4075_12962)">
          <line x1="58" y1="13" x2="58" y2="96.006" stroke="white" />
          <line x1="100.6" y1="13" x2="100.6" y2="96.006" stroke="white" />
          <line x1="143.2" y1="13" x2="143.2" y2="96.006" stroke="white" />
          <line x1="185.8" y1="13" x2="185.8" y2="96.006" stroke="white" />
          <line x1="228.4" y1="13" x2="228.4" y2="96.006" stroke="white" />
          <line x1="271" y1="13" x2="271" y2="96.006" stroke="white" />
        </g>
        <g clipPath="url(#clip1_4075_12962)">
          <rect x="21.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="64.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="107.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="150.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="193.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="236.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
          <rect x="279.5" y="3.5" width="27" height="47" fill="#E9EFF8" />
        </g>
        <g clipPath="url(#clip2_4075_12962)">
          <rect x="21.5" y="55" width="27" height="11" fill="#CBE1ED" />
          <rect x="64.5" y="37" width="27" height="47" fill="#CBE1ED" />
          <rect x="107.5" y="37" width="27" height="47" fill="#CBE1ED" />
          <rect x="150.5" y="37" width="27" height="47" fill="#CBE1ED" />
          <rect x="193.5" y="37" width="27" height="47" fill="#CBE1ED" />
          <rect x="236.5" y="37" width="27" height="47" fill="#CBE1ED" />
        </g>
        <g clipPath="url(#clip3_4075_12962)">
          <rect x="21.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="64.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="107.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="150.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="193.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="236.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
          <rect x="279.5" y="67.5" width="27" height="47" fill="#E1DBDB" />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_4075_12962"
          x="0.25"
          y="0.75"
          width="315.5"
          height="113.5"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="0.625"
            result="effect1_foregroundBlur_4075_12962"
          />
        </filter>
        <clipPath id="clip0_4075_12962">
          <rect
            width="301"
            height="91.006"
            fill="white"
            transform="translate(13.5 9)"
          />
        </clipPath>
        <clipPath id="clip1_4075_12962">
          <rect
            width="273"
            height="10"
            fill="white"
            transform="translate(21.5 22)"
          />
        </clipPath>
        <clipPath id="clip2_4075_12962">
          <rect
            width="242"
            height="55"
            fill="white"
            transform="translate(21.5 33)"
          />
        </clipPath>
        <clipPath id="clip3_4075_12962">
          <rect
            width="273"
            height="4"
            fill="white"
            transform="translate(21.5 89)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
