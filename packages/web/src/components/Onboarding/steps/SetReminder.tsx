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
import { OnboardingForm } from "../components/OnboardingForm";

const InputContainer = styled.div`
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.l};
  margin-bottom: 40px;
`;

const Input = styled(OnboardingInputWhite)``;

const HelpText = styled(OnboardingText)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 8px 0;
  font-size: ${({ theme }) => theme.text.size.l};
  color: rgb(87, 193, 255);
  text-align: center;
`;

const PLACEHOLDER = "Automate repetitive tasks";

export const SetReminder: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  const [reminder, setReminder] = useState("");
  const [showHelpText, setShowHelpText] = useState(false);

  // Set initial placeholder value in localStorage on mount
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDER, PLACEHOLDER);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Only show help text if the input is still empty
      if (!reminder.trim()) {
        setShowHelpText(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [reminder]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setReminder(value);
    const persistedValue = value.trim() !== "" ? value.trim() : PLACEHOLDER;
    localStorage.setItem(STORAGE_KEYS.REMINDER, persistedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };

  const handleNext = () => {
    // localStorage is already updated on every input change, so just proceed
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

      <OnboardingForm onSubmit={handleSubmit}>
        <InputContainer>
          <Input
            placeholder={PLACEHOLDER}
            value={reminder}
            onChange={handleInputChange}
            autoFocus
          />
          {showHelpText && (
            <HelpText>Fear not, you can always change this later.</HelpText>
          )}
        </InputContainer>

        <OnboardingFooter
          onSkip={onSkip}
          onPrev={onPrevious}
          onNext={handleNext}
          nextBtnDisabled={!!reminder && !reminder.trim()}
        />
      </OnboardingForm>
    </OnboardingStepBoilerplate>
  );
};
