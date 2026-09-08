export const SETUP_STEP_IDS = [
  "address",
  "hours",
  "duration",
  "destination",
  "live",
] as const;

export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export interface SetupStep {
  id: SetupStepId;
  title: string;
  sentence: string;
}

export const SETUP_STEPS: readonly SetupStep[] = [
  {
    id: "address",
    title: "Pick your address",
    sentence:
      "Pick the address people will use to book time with you. You can change it later.",
  },
  {
    id: "hours",
    title: "When can people meet with you?",
    sentence:
      "Choose the days and times you are free. You can change them later.",
  },
  {
    id: "duration",
    title: "How long is a meeting?",
    sentence: "Guests book this length every time.",
  },
  {
    id: "destination",
    title: "Where should meetings go?",
    sentence: "New meetings are created on this calendar.",
  },
  {
    id: "live",
    title: "Ready to go live",
    sentence: "Turn on your page to share the link.",
  },
];

export function visibleSetupSteps(
  writableCalendarCount: number,
): readonly SetupStep[] {
  return SETUP_STEPS.filter(
    (step) => step.id !== "destination" || writableCalendarCount >= 2,
  );
}

export function nextSetupStep(
  current: SetupStepId,
  steps: readonly SetupStep[],
): SetupStepId {
  const index = steps.findIndex((step) => step.id === current);
  const next = steps[Math.min(index + 1, steps.length - 1)];
  return next?.id ?? current;
}

export function prevSetupStep(
  current: SetupStepId,
  steps: readonly SetupStep[],
): SetupStepId {
  const index = steps.findIndex((step) => step.id === current);
  const previous = steps[Math.max(index - 1, 0)];
  return previous?.id ?? current;
}
