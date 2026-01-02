/**
 * Onboarding step IDs - defined once to avoid duplication
 * All step IDs used in the onboarding flow should be defined here
 */
export const ONBOARDING_STEP_IDS = {
  // Login steps
  WELCOME: "welcome",

  // Mobile login steps
  MOBILE_WARNING: "mobile-warning",
  MOBILE_SIGN_IN: "mobile-sign-in",

  // Main onboarding steps
  WELCOME_SCREEN: "welcome-screen",
  WELCOME_NOTE_ONE: "welcome-note-one",
  WELCOME_NOTE_TWO: "welcome-note-two",
  SIGN_IN_WITH_GOOGLE_PRELUDE: "sign-in-with-google-prelude",
  SIGN_IN_WITH_GOOGLE: "sign-in-with-google",
  SET_SOMEDAY_EVENTS_ONE: "set-someday-events-one",
  TASKS_INTRO: "tasks-intro",
  TASKS_TODAY: "tasks-today",
  SOMEDAY_EVENTS_INTRO: "someday-events-intro",
  SOMEDAY_SANDBOX: "someday-sandbox",
  MIGRATION_INTRO: "migration-intro",
  SOMEDAY_MIGRATION: "someday-migration",
  OUTRO_TWO: "outro-two",
  OUTRO_QUOTE: "outro-quote",
} as const;

/**
 * Step IDs to skip when re-doing onboarding for authenticated users
 * These steps are skipped because the user has already completed Google login
 * and event import during their initial onboarding
 */
export const SKIPPED_STEPS_FOR_AUTHENTICATED_USERS: readonly string[] = [
  ONBOARDING_STEP_IDS.SIGN_IN_WITH_GOOGLE_PRELUDE,
  ONBOARDING_STEP_IDS.SIGN_IN_WITH_GOOGLE,
  ONBOARDING_STEP_IDS.MIGRATION_INTRO,
  ONBOARDING_STEP_IDS.SOMEDAY_MIGRATION,
];
