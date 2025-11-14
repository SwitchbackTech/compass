import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthCheck } from "@web/auth/useAuthCheck";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import {
  useOnboarding,
  withOnboardingProvider,
} from "@web/views/Onboarding/components/OnboardingContext";
import {
  ONBOARDING_STEP_IDS,
  SKIPPED_STEPS_FOR_AUTHENTICATED_USERS,
} from "./constants/onboarding.constants";
import { Onboarding, OnboardingStepProps, OnboardingStepType } from "./index";
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
} from "./steps";
import { MigrationIntro } from "./steps/events/MigrationIntro/MigrationIntro";
import { MigrationSandbox } from "./steps/events/MigrationSandbox/MigrationSandbox";
import { SomedayEventsIntro } from "./steps/events/SomedayEventsIntro/SomedayEventsIntro";
import { SomedaySandbox } from "./steps/events/SomedaySandbox/SomedaySandbox";
import { MobileSignIn } from "./steps/mobile/MobileSignIn";
import { MobileWarning } from "./steps/mobile/MobileWarning";
import { ReminderIntroOne } from "./steps/reminder/ReminderIntroOne";
import { ReminderIntroTwo } from "./steps/reminder/ReminderIntroTwo";
import { TasksToday } from "./steps/tasks/TasksToday/TasksToday";

const _OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHideSteps } = useOnboarding();
  const isMobile = useIsMobile();
  const { hasCompletedSignup } = useHasCompletedSignup();
  const { isAuthenticated } = useAuthCheck();

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Determine if we're on the /onboarding route (vs /login)
  const isOnboardingRoute = location.pathname === ROOT_ROUTES.ONBOARDING;

  // Filter steps based on route and authentication status
  // When re-doing onboarding on /onboarding route, skip Google login and event import steps
  const filterOnboardingSteps = (
    steps: OnboardingStepType[],
  ): OnboardingStepType[] => {
    if (!isOnboardingRoute) {
      return steps;
    }

    // If user is authenticated, skip Google login and event import steps
    if (isAuthenticated === true) {
      return steps.filter(
        (step) => !SKIPPED_STEPS_FOR_AUTHENTICATED_USERS.includes(step.id),
      );
    }

    return steps;
  };

  const loginSteps: OnboardingStepType[] = [
    {
      id: ONBOARDING_STEP_IDS.WELCOME,
      component: (props: OnboardingStepProps) => <WelcomeStep {...props} />,
    },
  ];

  // Mobile-specific login steps
  const mobileLoginSteps: OnboardingStepType[] = [
    {
      id: ONBOARDING_STEP_IDS.MOBILE_WARNING,
      component: (props: OnboardingStepProps) => <MobileWarning {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.MOBILE_SIGN_IN,
      component: (props: OnboardingStepProps) => <MobileSignIn {...props} />,
      handlesKeyboardEvents: true,
    },
  ];

  const onboardingSteps: OnboardingStepType[] = [
    {
      id: ONBOARDING_STEP_IDS.WELCOME_SCREEN,
      component: (props: OnboardingStepProps) => (
        <WelcomeScreen firstName="hello" {...props} />
      ),
    },
    {
      id: ONBOARDING_STEP_IDS.WELCOME_NOTE_ONE,
      component: (props: OnboardingStepProps) => <WelcomeNoteOne {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.WELCOME_NOTE_TWO,
      component: (props: OnboardingStepProps) => <WelcomeNoteTwo {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.SIGN_IN_WITH_GOOGLE_PRELUDE,
      component: (props: OnboardingStepProps) => (
        <SignInWithGooglePrelude {...props} />
      ),
    },
    {
      id: ONBOARDING_STEP_IDS.SIGN_IN_WITH_GOOGLE,
      component: (props: OnboardingStepProps) => (
        <SignInWithGoogle {...props} />
      ),
      handlesKeyboardEvents: true,
    },
    {
      id: ONBOARDING_STEP_IDS.REMINDER_INTRO_ONE,
      component: (props: OnboardingStepProps) => (
        <ReminderIntroOne {...props} />
      ),
      disablePrevious: true,
    },
    {
      id: ONBOARDING_STEP_IDS.REMINDER_INTRO_TWO,
      component: (props: OnboardingStepProps) => (
        <ReminderIntroTwo {...props} />
      ),
    },
    {
      id: ONBOARDING_STEP_IDS.SET_REMINDER,
      component: (props: OnboardingStepProps) => <SetReminder {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.SET_REMINDER_SUCCESS,
      component: (props: OnboardingStepProps) => (
        <SetReminderSuccess {...props} />
      ),
    },

    {
      id: ONBOARDING_STEP_IDS.SET_SOMEDAY_EVENTS_ONE,
      component: (props: OnboardingStepProps) => <DayTasksIntro {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.TASKS_INTRO,
      component: (props: OnboardingStepProps) => <TasksIntro {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.TASKS_TODAY,
      component: (props: OnboardingStepProps) => <TasksToday {...props} />,
    },
    {
      id: ONBOARDING_STEP_IDS.SOMEDAY_EVENTS_INTRO,
      component: (props: OnboardingStepProps) => (
        <SomedayEventsIntro {...props} />
      ),
    },
    {
      id: ONBOARDING_STEP_IDS.SOMEDAY_SANDBOX,
      component: (props: OnboardingStepProps) => <SomedaySandbox {...props} />,
      handlesKeyboardEvents: true,
    },
    {
      id: ONBOARDING_STEP_IDS.MIGRATION_INTRO,
      component: (props: OnboardingStepProps) => <MigrationIntro {...props} />,
      disablePrevious: true,
    },
    {
      id: ONBOARDING_STEP_IDS.SOMEDAY_MIGRATION,
      component: (props: OnboardingStepProps) => (
        <MigrationSandbox {...props} />
      ),
    },
    {
      id: ONBOARDING_STEP_IDS.OUTRO_TWO,
      component: (props: OnboardingStepProps) => <OutroTwo {...props} />,
      disablePrevious: true,
    },
    {
      id: ONBOARDING_STEP_IDS.OUTRO_QUOTE,
      component: (props: OnboardingStepProps) => <OutroQuote {...props} />,
      disablePrevious: true,
      disableRightArrow: true,
    },
  ];

  // Initially hide the steps until the user logs in
  // For returning users, show the steps immediately
  // On /onboarding route, always show steps (ignore localStorage)
  useEffect(() => {
    if (isOnboardingRoute) {
      setHideSteps(false);
    } else if (hasCompletedSignup) {
      setHideSteps(false);
    } else {
      setHideSteps(true);
    }
  }, [setHideSteps, hasCompletedSignup, isOnboardingRoute]);

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

  // Determine initial step based on signup status and route
  // On /onboarding route, always start from beginning (ignore localStorage)
  // On /login route, preserve existing behavior (skip to login if completed)
  const getInitialStepIndex = () => {
    // On /onboarding route, ignore localStorage and always start from beginning
    if (isOnboardingRoute) {
      return 0;
    }

    // On /login route, preserve existing behavior
    if (hasCompletedSignup) {
      // Find the index of "sign-in-with-google" step
      const signInStepIndex = onboardingSteps.findIndex(
        (step) => step.id === ONBOARDING_STEP_IDS.SIGN_IN_WITH_GOOGLE,
      );
      return signInStepIndex !== -1 ? signInStepIndex : 0;
    }
    return 0; // Start from beginning for new users
  };

  // On /onboarding route, ignore localStorage check and show full flow
  // On /login route, preserve existing behavior
  if (!isOnboardingRoute && hasCompletedSignup === null) {
    return null;
  }

  // On /login route, show login steps first if user hasn't completed signup
  if (!isOnboardingRoute && !showOnboarding && !hasCompletedSignup) {
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

  // Filter steps based on route and authentication status
  const filteredSteps = filterOnboardingSteps(onboardingSteps);

  return (
    <Onboarding
      key="main-onboarding"
      steps={filteredSteps}
      initialStepIndex={getInitialStepIndex()}
      onComplete={() => {
        navigate(ROOT_ROUTES.DAY);
      }}
    />
  );
};

export const OnboardingFlow = withOnboardingProvider(_OnboardingFlow);
export default OnboardingFlow;
