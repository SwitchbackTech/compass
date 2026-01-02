import React, { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { useSkipOnboarding } from "@web/auth/useSkipOnboarding";
import { UserApi } from "@web/common/apis/user.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { useSession } from "@web/common/hooks/useSession";
import {
  ONBOARDING_STEP_IDS,
  SKIPPED_STEPS_FOR_AUTHENTICATED_USERS,
} from "@web/views/Onboarding//constants/onboarding.constants";
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
import { TasksToday } from "@web/views/Onboarding/steps/tasks/TasksToday/TasksToday";

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
    component: (props: OnboardingStepProps) => <SignInWithGoogle {...props} />,
    handlesKeyboardEvents: true,
  },

  {
    id: ONBOARDING_STEP_IDS.SET_SOMEDAY_EVENTS_ONE,
    component: (props: OnboardingStepProps) => <DayTasksIntro {...props} />,
    disablePrevious: true,
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
    component: (props: OnboardingStepProps) => <MigrationSandbox {...props} />,
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

const _OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHideSteps } = useOnboarding();
  const isMobile = useIsMobile();
  const { hasCompletedSignup } = useHasCompletedSignup();
  const { authenticated } = useSession();
  const { skipOnboarding, updateOnboardingStatus } = useSkipOnboarding();

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
    if (authenticated) {
      return steps.filter(
        (step) => !SKIPPED_STEPS_FOR_AUTHENTICATED_USERS.includes(step.id),
      );
    }

    return steps;
  };

  // Determine initial step based on signup status and route
  // On /onboarding route, always start from beginning (ignore localStorage)
  // On /login route, preserve existing behavior (skip to login if completed)
  const getInitialStepIndex = useCallback(() => {
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
  }, [hasCompletedSignup]);

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
          navigate(ROOT_ROUTES.ROOT);
        }}
      />
    );
  }

  // On /onboarding route, ignore localStorage check and show full flow
  // On /login route, preserve existing behavior
  if (!isOnboardingRoute && hasCompletedSignup === null) {
    return null;
  }

  // On /login route, show login steps first if user hasn't completed signup
  if (!isOnboardingRoute && skipOnboarding && !hasCompletedSignup) {
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
      steps={filterOnboardingSteps(onboardingSteps)}
      initialStepIndex={getInitialStepIndex()}
      onComplete={() => {
        UserApi.updateMetadata({ skipOnboarding: true })
          .then(() => updateOnboardingStatus(true))
          .catch((error) =>
            console.error("Failed to update user metadata:", error),
          );

        navigate(ROOT_ROUTES.DAY);
      }}
    />
  );
};

export const OnboardingFlow = withOnboardingProvider(_OnboardingFlow);
export default OnboardingFlow;
