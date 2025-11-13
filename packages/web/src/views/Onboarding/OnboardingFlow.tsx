import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { useSkipOnboarding } from "@web/auth/useSkipOnboarding";
import { UserApi } from "@web/common/apis/user.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import {
  useOnboarding,
  withOnboardingProvider,
} from "@web/views/Onboarding/components/OnboardingContext";
import {
  Onboarding,
  OnboardingStepProps,
  OnboardingStepType,
} from "@web/views/Onboarding/index";
import {
  DayTasksIntro,
  OutroQuote,
  OutroTwo,
  SetReminder,
  SetReminderSuccess,
  SignInWithGoogle,
  SignInWithGooglePrelude,
  TasksIntro,
  WelcomeNoteOne,
  WelcomeNoteTwo,
  WelcomeScreen,
  WelcomeStep,
} from "@web/views/Onboarding/steps";
import { MigrationIntro } from "@web/views/Onboarding/steps/events/MigrationIntro/MigrationIntro";
import { MigrationSandbox } from "@web/views/Onboarding/steps/events/MigrationSandbox/MigrationSandbox";
import { SomedayEventsIntro } from "@web/views/Onboarding/steps/events/SomedayEventsIntro/SomedayEventsIntro";
import { SomedaySandbox } from "@web/views/Onboarding/steps/events/SomedaySandbox/SomedaySandbox";
import { MobileSignIn } from "@web/views/Onboarding/steps/mobile/MobileSignIn";
import { MobileWarning } from "@web/views/Onboarding/steps/mobile/MobileWarning";
import { ReminderIntroOne } from "@web/views/Onboarding/steps/reminder/ReminderIntroOne";
import { ReminderIntroTwo } from "@web/views/Onboarding/steps/reminder/ReminderIntroTwo";
import { TasksToday } from "@web/views/Onboarding/steps/tasks/TasksToday/TasksToday";

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
    component: (props: OnboardingStepProps) => <SignInWithGoogle {...props} />,
    handlesKeyboardEvents: true,
  },
  {
    id: "reminder-intro-one",
    component: (props: OnboardingStepProps) => <ReminderIntroOne {...props} />,
    disablePrevious: true,
  },
  {
    id: "reminder-intro-two",
    component: (props: OnboardingStepProps) => <ReminderIntroTwo {...props} />,
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
    component: (props: OnboardingStepProps) => <DayTasksIntro {...props} />,
  },
  {
    id: "tasks-intro",
    component: (props: OnboardingStepProps) => <TasksIntro {...props} />,
  },
  {
    id: "tasks-today",
    component: (props: OnboardingStepProps) => <TasksToday {...props} />,
  },
  {
    id: "someday-events-intro",
    component: (props: OnboardingStepProps) => (
      <SomedayEventsIntro {...props} />
    ),
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
    component: (props: OnboardingStepProps) => <MigrationSandbox {...props} />,
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
    component: (props: OnboardingStepProps) => <SignInWithGoogle {...props} />,
    handlesKeyboardEvents: true,
  },
  {
    id: "reminder-intro-one",
    component: (props: OnboardingStepProps) => <ReminderIntroOne {...props} />,
    disablePrevious: true,
  },
  {
    id: "reminder-intro-two",
    component: (props: OnboardingStepProps) => <ReminderIntroTwo {...props} />,
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
    component: (props: OnboardingStepProps) => <DayTasksIntro {...props} />,
  },
  {
    id: "tasks-intro",
    component: (props: OnboardingStepProps) => <TasksIntro {...props} />,
  },
  {
    id: "tasks-today",
    component: (props: OnboardingStepProps) => <TasksToday {...props} />,
  },
  {
    id: "someday-events-intro",
    component: (props: OnboardingStepProps) => (
      <SomedayEventsIntro {...props} />
    ),
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
    component: (props: OnboardingStepProps) => <MigrationSandbox {...props} />,
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

const _OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { setHideSteps } = useOnboarding();
  const isMobile = useIsMobile();
  const { hasCompletedSignup } = useHasCompletedSignup();
  const { skipOnboarding, updateOnboardingStatus } = useSkipOnboarding();

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

  // Determine initial step based on signup status
  // If user has completed signup before, skip welcome screens and start at sign-in-with-google
  const getInitialStepIndex = useCallback(() => {
    if (hasCompletedSignup) {
      // Find the index of "sign-in-with-google" step
      const signInStepIndex = onboardingSteps.findIndex(
        (step) => step.id === "sign-in-with-google",
      );
      return signInStepIndex !== -1 ? signInStepIndex : 0;
    }
    return 0; // Start from beginning for new users
  }, [hasCompletedSignup]);

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

  if (hasCompletedSignup === null) {
    return null;
  }

  if (skipOnboarding && !hasCompletedSignup) {
    return (
      <Onboarding
        key="login-onboarding"
        steps={loginSteps}
        onComplete={() => {
          updateOnboardingStatus(false);
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
        updateOnboardingStatus(true);

        UserApi.updateMetadata({ skipOnboarding: true }).catch((error) =>
          console.error("Failed to update user metadata:", error),
        );

        navigate(ROOT_ROUTES.DAY);
      }}
    />
  );
};

export const OnboardingFlow = withOnboardingProvider(_OnboardingFlow);
export default OnboardingFlow;
