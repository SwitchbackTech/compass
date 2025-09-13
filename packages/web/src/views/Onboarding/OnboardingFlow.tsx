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
  SignInWithGoogle,
  SignInWithGooglePrelude,
  SomedayIntroOne,
  SomedayIntroTwo,
  WaitlistCheck,
  WelcomeNoteOne,
  WelcomeNoteTwo,
  WelcomeScreen,
  WelcomeStep,
} from "./steps";
import { MigrationIntro } from "./steps/events/MigrationIntro/MigrationIntro";
import { MigrationSandbox } from "./steps/events/MigrationSandbox/MigrationSandbox";
import { SomedaySandbox } from "./steps/events/SomedaySandbox/SomedaySandbox";
import { ReminderIntroOne } from "./steps/reminder/ReminderIntroOne";
import { ReminderIntroTwo } from "./steps/reminder/ReminderIntroTwo";

const _OnboardingFlow: React.FC = () => {
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
      handlesKeyboardEvents: true, // prevents nav via keyboard
    });
  }

  const onboardingSteps: OnboardingStepType[] = [
    {
      id: "welcome-screen",
      component: (props: OnboardingStepProps) => (
        <WelcomeScreen firstName="hello" {...props} />
      ),
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
      handlesKeyboardEvents: true,
    },
    {
      id: "reminder-intro-one",
      component: (props: OnboardingStepProps) => (
        <ReminderIntroOne {...props} />
      ),
      disablePrevious: true,
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
      component: (props: OnboardingStepProps) => <SomedayIntroOne {...props} />,
    },
    {
      id: "set-someday-event-two",
      component: (props: OnboardingStepProps) => <SomedayIntroTwo {...props} />,
    },
    {
      id: "someday-sandbox",
      component: (props: OnboardingStepProps) => <SomedaySandbox {...props} />,
      handlesKeyboardEvents: true,
    },
    {
      id: "migration-intro",
      component: (props: OnboardingStepProps) => <MigrationIntro {...props} />,
    },
    {
      id: "someday-migration",
      component: (props: OnboardingStepProps) => (
        <MigrationSandbox {...props} />
      ),
      handlesKeyboardEvents: true,
    },
    {
      id: "outro-two",
      component: (props: OnboardingStepProps) => <OutroTwo {...props} />,
      disablePrevious: true,
    },
    {
      id: "outro-quote",
      component: (props: OnboardingStepProps) => <OutroQuote {...props} />,
      disablePrevious: true,
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

export const OnboardingFlow = withProvider(_OnboardingFlow);
export default OnboardingFlow;
