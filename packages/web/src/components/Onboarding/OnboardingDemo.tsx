import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IS_DEV } from "@web/common/constants/env.constants";
import {
  useOnboarding,
  withProvider,
} from "@web/components/Onboarding/components/OnboardingContext";
import { Onboarding, OnboardingStepProps, OnboardingStepType } from "./index";
import {
  EmailStep,
  FinalOnboardingReminder,
  SetHeaderNote,
  SetHeaderNoteNoteOne,
  SetHeaderNoteNoteTwo,
  SetHeaderNoteSuccess,
  SetSomedayEvents,
  SetSomedayEventsNoteOne,
  SetSomedayEventsNoteTwo,
  SetSomedayEventsPrelude,
  SignInWithGoogle,
  SignInWithGooglePrelude,
  WelcomeNoteOne,
  WelcomeNoteTwo,
  WelcomeScreen,
  WelcomeStep,
} from "./steps";

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
      component: EmailStep,
      disableRightArrow: true,
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
      disableRightArrow: true,
    },
    {
      id: "set-someday-events-prelude",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEventsPrelude {...props} />
      ),
      disableLeftArrow: true,
    },
    {
      id: "set-header-note",
      component: (props: OnboardingStepProps) => <SetHeaderNote {...props} />,
    },
    {
      id: "set-header-note-success",
      component: (props: OnboardingStepProps) => (
        <SetHeaderNoteSuccess {...props} />
      ),
    },
    {
      id: "set-header-note-note-one",
      component: (props: OnboardingStepProps) => (
        <SetHeaderNoteNoteOne {...props} />
      ),
    },
    {
      id: "set-header-note-note-two",
      component: (props: OnboardingStepProps) => (
        <SetHeaderNoteNoteTwo {...props} />
      ),
    },
    {
      id: "set-someday-events",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEvents {...props} />
      ),
    },
    {
      id: "set-someday-events-note-one",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEventsNoteOne {...props} />
      ),
    },
    {
      id: "set-someday-events-note-two",
      component: (props: OnboardingStepProps) => (
        <SetSomedayEventsNoteTwo {...props} />
      ),
    },
    {
      id: "final-onboarding-reminder",
      component: (props: OnboardingStepProps) => (
        <FinalOnboardingReminder {...props} />
      ),
      disableLeftArrow: true,
      disableRightArrow: true,
    },
  ];

  // Initially hide the steps til the user logs in
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
