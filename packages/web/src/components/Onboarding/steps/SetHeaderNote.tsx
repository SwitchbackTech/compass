import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  OnboardingFooter,
  OnboardingInputWhite,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

const InputContainer = styled.div`
  width: 100%;
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.l};
  margin-bottom: ${({ theme }) => theme.spacing.l};
`;

const Input = styled(OnboardingInputWhite)``;

const HelpText = styled(OnboardingText)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  font-size: ${({ theme }) => theme.text.size.l};
  color: rgb(87, 193, 255);
  text-align: center;
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
  const [showHelpText, setShowHelpText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelpText(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    localStorage.setItem(
      STORAGE_KEYS.HEADER_NOTE,
      headerNote.trim() || PLACEHOLDER,
    );
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

      <InputContainer>
        <Input
          placeholder={PLACEHOLDER}
          value={headerNote}
          onChange={(e) => setHeaderNote(e.target.value)}
        />
        {showHelpText && (
          <HelpText>Fear not, you can always change this later.</HelpText>
        )}
      </InputContainer>

      <OnboardingFooter
        onSkip={onSkip}
        onPrev={onPrevious}
        onNext={handleNext}
        nextBtnDisabled={!!headerNote && !headerNote.trim()}
      />
    </OnboardingStepBoilerplate>
  );
};
