import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import {
  useOnboarding,
  withOnboardingProvider,
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
  TaskIntro,
  WelcomeNoteOne,
  WelcomeNoteTwo,
  WelcomeScreen,
  WelcomeStep,
} from "./steps";
import { MigrationIntro } from "./steps/events/MigrationIntro/MigrationIntro";
import { MigrationSandbox } from "./steps/events/MigrationSandbox/MigrationSandbox";
import { SomedaySandbox } from "./steps/events/SomedaySandbox/SomedaySandbox";
import { TasksToday } from "./steps/events/TasksToday/TasksToday";
import { MobileSignIn } from "./steps/mobile/MobileSignIn";
import { MobileWarning } from "./steps/mobile/MobileWarning";
import { ReminderIntroOne } from "./steps/reminder/ReminderIntroOne";
import { ReminderIntroTwo } from "./steps/reminder/ReminderIntroTwo";

const _OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { setHideSteps } = useOnboarding();
  const isMobile = useIsMobile();
  const { hasCompletedSignup } = useHasCompletedSignup();

  // TODO revert this before merging
  const [showOnboarding, setShowOnboarding] = useState(true);

  const loginSteps: OnboardingStepType[] = [
    {
      id: "welcome",
      component: (props: OnboardingStepProps) => <WelcomeStep {...props} />,
    },
  ];

  // Mobile-specific login steps
  const mobileLoginSteps: OnboardingStepType[] = [
    {
      id: "mobile-warning",
      component: (props: OnboardingStepProps) => <MobileWarning {...props} />,
    },
    {
      id: "mobile-sign-in",
      component: (props: OnboardingStepProps) => <MobileSignIn {...props} />,
      handlesKeyboardEvents: true,
    },
  ];

  const onboardingSteps: OnboardingStepType[] = [
    {
      id: "tasks-today",
      component: (props: OnboardingStepProps) => <TasksToday {...props} />,
    },
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
      id: "tasks-intro",
      component: (props: OnboardingStepProps) => <TaskIntro {...props} />,
    },
    {
      id: "tasks-today",
      component: (props: OnboardingStepProps) => <TasksToday {...props} />,
    },
    {
      id: "someday-sandbox",
      component: (props: OnboardingStepProps) => <SomedaySandbox {...props} />,
      handlesKeyboardEvents: true,
    },
    {
      id: "migration-intro",
      component: (props: OnboardingStepProps) => <MigrationIntro {...props} />,
      disablePrevious: true,
    },
    {
      id: "someday-migration",
      component: (props: OnboardingStepProps) => (
        <MigrationSandbox {...props} />
      ),
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
  // For returning users, show the steps immediately
  useEffect(() => {
    if (hasCompletedSignup) {
      setHideSteps(false);
    } else {
      setHideSteps(true);
    }
  }, [setHideSteps, hasCompletedSignup]);

  // Show mobile flow if on mobile device
  if (isMobile) {
    return (
      <Onboarding
        key="mobile-onboarding"
        steps={mobileLoginSteps}
        onComplete={() => {
          navigate("/");
        }}
      />
    );
  }

  // Determine initial step based on signup status
  // If user has completed signup before, skip welcome screens and start at sign-in-with-google
  const getInitialStepIndex = () => {
    if (hasCompletedSignup) {
      // Find the index of "sign-in-with-google" step
      const signInStepIndex = onboardingSteps.findIndex(
        (step) => step.id === "sign-in-with-google",
      );
      return signInStepIndex !== -1 ? signInStepIndex : 0;
    }
    return 0; // Start from beginning for new users
  };

  if (hasCompletedSignup === null) {
    return null;
  }

  if (!showOnboarding && !hasCompletedSignup) {
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
      initialStepIndex={getInitialStepIndex()}
      onComplete={() => {
        navigate("/");
      }}
    />
  );
};

export const OnboardingFlow = withOnboardingProvider(_OnboardingFlow);
export default OnboardingFlow;
