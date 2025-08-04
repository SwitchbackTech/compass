import React, { useState } from "react";
import styled from "styled-components";
import { OnboardingHeaderNoteLocalStorage } from "@web/components/Onboarding/utils";
import {
  OnboardingFooter,
  OnboardingInputWhite,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

const Input = styled(OnboardingInputWhite)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

const PLACEHOLDER = "Automate repetitive tasks";

export const SetHeaderNote: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  const [headerNote, setHeaderNote] = useState("");

  const handleNext = () => {
    OnboardingHeaderNoteLocalStorage.set(headerNote.trim() || PLACEHOLDER);
    onNext();
  };

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>
        There is always ONE thing that matters most.
      </OnboardingText>
      <OnboardingText>So I ask you, wise Captain:</OnboardingText>

      <OnboardingText>
        What is the ONE thing you can do this week, such that by doing it
        everything else will become easier or unnecessary?
      </OnboardingText>

      <Input
        placeholder={PLACEHOLDER}
        value={headerNote}
        onChange={(e) => setHeaderNote(e.target.value)}
      />

      <OnboardingFooter
        onSkip={onSkip}
        onPrev={onPrevious}
        onNext={handleNext}
        nextBtnDisabled={!!headerNote && !headerNote.trim()}
      />
    </OnboardingStepBoilerplate>
  );
};
