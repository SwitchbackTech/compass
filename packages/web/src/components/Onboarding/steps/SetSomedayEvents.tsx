import dayjs from "dayjs";
import React, { useState } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { getUserId } from "@web/auth/auth.util";
import { Schema_SomedayEvent } from "@web/common/types/web.event.types";
import { prepSomedayEventBeforeSubmit } from "@web/common/utils/event.util";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import {
  OnboardingFooter,
  OnboardingInputContainer,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingInputWhite,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { OnboardingForm } from "../components/OnboardingForm";

const SOMEDAY_EVENT_ONE_PLACEHOLDER = "RSVP to Pip’s wedding invite";
const SOMEDAY_EVENT_TWO_PLACEHOLDER = "Order mahogany peg leg";

export const SetSomedayEvents: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const dispatch = useAppDispatch();
  const [somedayEventOne, setSomedayEventOne] = useState("");
  const [somedayEventTwo, setSomedayEventTwo] = useState("");

  const createSomedayEvent = async (title: string, order: number) => {
    const startDate = dayjs().startOf("week").toISOString();
    const endDate = dayjs().endOf("week").toISOString();

    let _event: Schema_SomedayEvent = {
      title,
      isSomeday: true,
      order,
      startDate,
      endDate,
      origin: Origin.COMPASS,
      user: await getUserId(),
      priority: Priorities.UNASSIGNED,
    };

    const userId = await getUserId();
    _event = prepSomedayEventBeforeSubmit(_event, userId);
    dispatch(createEventSlice.actions.request(_event));

    return _event;
  };

  const handleNext = async () => {
    const _somedayEventTitleOne =
      somedayEventOne || SOMEDAY_EVENT_ONE_PLACEHOLDER;
    const _somedayEventTitleTwo =
      somedayEventTwo || SOMEDAY_EVENT_TWO_PLACEHOLDER;

    await Promise.all([
      createSomedayEvent(_somedayEventTitleOne, 0),
      createSomedayEvent(_somedayEventTitleTwo, 1),
    ]);

    onNext();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleNext();
  };

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>Let’s not delay.</OnboardingText>
      <OnboardingText>
        Enter two tasks you want to do this month.
      </OnboardingText>

      <OnboardingForm onSubmit={handleSubmit}>
        <OnboardingInputContainer>
          <OnboardingInputSection>
            <OnboardingInputLabel htmlFor="someday-event-1">
              Task 1:
            </OnboardingInputLabel>
            <OnboardingInputWhite
              id="someday-event-1"
              placeholder={SOMEDAY_EVENT_ONE_PLACEHOLDER}
              value={somedayEventOne}
              onChange={(e) => setSomedayEventOne(e.target.value)}
            />
          </OnboardingInputSection>

          <OnboardingInputSection>
            <OnboardingInputLabel htmlFor="someday-event-2">
              Task 2:
            </OnboardingInputLabel>
            <OnboardingInputWhite
              id="someday-event-2"
              placeholder={SOMEDAY_EVENT_TWO_PLACEHOLDER}
              value={somedayEventTwo}
              onChange={(e) => setSomedayEventTwo(e.target.value)}
            />
          </OnboardingInputSection>
        </OnboardingInputContainer>

        <OnboardingFooter
          onSkip={onSkip}
          onPrev={onPrevious}
          onNext={handleNext}
          nextBtnDisabled={
            (!!somedayEventOne && !somedayEventOne.trim()) ||
            (!!somedayEventTwo && !somedayEventTwo.trim())
          }
        />
      </OnboardingForm>
    </OnboardingStepBoilerplate>
  );
};
