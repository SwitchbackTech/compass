import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ShuffleAngular } from "@phosphor-icons/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import IconButton from "@web/components/IconButton/IconButton";
import {
  OnboardingCardLayout,
  OnboardingText,
  OnboardingTextareaWhite,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingForm } from "../../components/OnboardingForm";
import { REMINDERS } from "./reminders";

const InputContainer = styled.div`
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.l};
  margin-bottom: 40px;
`;

const Input = styled(OnboardingTextareaWhite)``;

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

  const persistReminder = (value: string) => {
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

  const handleShuffle = () => {
    const randomReminder =
      REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
    persistReminder(randomReminder);
  };

  const ShuffleIcon = (props: React.ComponentProps<typeof ShuffleAngular>) => (
    <IconButton {...props}>
      <ShuffleAngular color="#FFFFFF" size={32} />
    </IconButton>
  );

  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={handleNext}
      nextBtnDisabled={!!reminder && !reminder.trim()}
    >
      <OnboardingText>
        The sea is calm now. It's a good time to set a Reminder.
      </OnboardingText>
      <OnboardingText>What do you want to remember this week?</OnboardingText>

      <OnboardingForm onSubmit={handleSubmit}>
        <InputContainer>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Input
              placeholder={PLACEHOLDER}
              value={reminder}
              onChange={(e) => persistReminder(e.target.value)}
              autoFocus
              style={{ flex: 1 }}
            />
            <div style={{ marginLeft: 8, cursor: "pointer" }}>
              <ShuffleIcon color="#FFFFFF" size={32} onClick={handleShuffle} />
            </div>
          </div>
          {showHelpText && (
            <HelpText>Fear not, you can always change this later.</HelpText>
          )}
        </InputContainer>
      </OnboardingForm>
    </OnboardingCardLayout>
  );
};
