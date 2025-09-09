import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IS_DEV } from "@web/common/constants/env.constants";
import {
  useOnboarding,
  withProvider,
} from "@web/views/Onboarding/components/OnboardingContext";
import { Onboarding, OnboardingStepProps, OnboardingStepType } from "./index";
import {
  OutroQuote,
  OutroTwo,
  SetReminder,
  SetReminderSuccess,
  SetSomedayEventTwo,
  SetSomedayEventsOne,
  SetSomedayEventsSuccess,
  SignInWithGoogle,
  SignInWithGooglePrelude,
  WaitlistCheck,
  WelcomeNoteOne,
  WelcomeNoteTwo,
  WelcomeScreen,
  WelcomeStep,
} from "./steps";
import { SomedaySandbox } from "./steps/events/SomedaySandbox";
import { ReminderIntroOne } from "./steps/reminder/ReminderIntroOne";
import { ReminderIntroTwo } from "./steps/reminder/ReminderIntroTwo";

const OnboardingDemo_: React.FC = () => {
  const navigate = useNavigate();
  const { setHideSteps } = useOnboarding();

  const [showOnboarding, setShowOnboarding] = useState(false);

  const loginSteps: OnboardingStepType[] = [
    {
      id: "welcome",
      component: (props: OnboardingStepProps) => <WelcomeStep {...props} />,
    },
  ];

  if (!IS_DEV) {
    // only show email step in prod in order
    // to allow contributors on localhost through
    loginSteps.push({
      id: "email",
      component: WaitlistCheck,
      disableRightArrow: true,
    });
  }

  const onboardingSteps: OnboardingStepType[] = [
    {
      id: "welcome-screen",
      component: (props: OnboardingStepProps) => (
        <WelcomeScreen firstName="hello" {...props} />
      ),
      disableLeftArrow: true,
    },
    {
      id: "welcome-note-one",
      component: (props: OnboardingStepProps) => <WelcomeNoteOne {...props} />,
    },
    {
      id: "welcome-note-two",
      component: (props: OnboardingStepProps) => <WelcomeNoteTwo {...props} />,
    },
    {
      id: "sign-in-with-google-prelude",
      component: (props: OnboardingStepProps) => (
        <SignInWithGooglePrelude {...props} />
      ),
    },
    {
      id: "sign-in-with-google",
      component: (props: OnboardingStepProps) => (
        <SignInWithGoogle {...props} />
      ),
      disableRightArrow: true,
      preventNavigation: true,
      handlesKeyboardEvents: true,
    },
    {
      id: "reminder-intro-one",
      component: (props: OnboardingStepProps) => (
        <ReminderIntroOne {...props} />
      ),
    },
    {
      id: "reminder-intro-two",
      component: (props: OnboardingStepProps) => (
        <ReminderIntroTwo {...props} />
      ),
    },
    {
      id: "set-reminder",
      component: (props: OnboardingStepProps) => <SetReminder {...props} />,
    },
    {
      id: "set-reminder-success",
      component: (props: OnboardingStepProps) => (
        <SetReminderSuccess {...props} />
      ),
    },
    {
      id: "set-someday-events-one",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEventsOne {...props} />
      ),
    },
    {
      id: "set-someday-event-two",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEventTwo {...props} />
      ),
    },
    {
      id: "someday-sandbox",
      component: (props: OnboardingStepProps) => <SomedaySandbox {...props} />,
      preventNavigation: true,
    },

    {
      id: "outro-two",
      component: (props: OnboardingStepProps) => <OutroTwo {...props} />,
      disableLeftArrow: true,
    },
    {
      id: "outro-quote",
      component: (props: OnboardingStepProps) => <OutroQuote {...props} />,
      disableLeftArrow: true,
      disableRightArrow: true,
    },
  ];

  // Initially hide the steps until the user logs in
  useEffect(() => {
    setHideSteps(true);
  }, [setHideSteps]);

  if (!showOnboarding) {
    return (
      <Onboarding
        key="login-onboarding"
        steps={loginSteps}
        onComplete={() => {
          setShowOnboarding(true);
          setHideSteps(false);
        }}
      />
    );
  }

  return (
    <Onboarding
      key="main-onboarding"
      steps={onboardingSteps}
      onComplete={() => {
        navigate("/");
      }}
    />
  );
};

export const OnboardingDemo = withProvider(OnboardingDemo_);
export default OnboardingDemo;
