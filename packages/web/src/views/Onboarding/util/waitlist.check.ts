// Types for waitlist check result
export type NextAction = "NOTHING" | "SHOW_WAITLIST_BTN" | "NEXT_BTN";

export interface WaitlistCheckResult {
  message: string;
  nextAction: NextAction;
  firstName?: string;
}

const normalizeFirstName = (firstName?: string) => {
  if (!firstName) {
    return undefined;
  }

  const trimmed = firstName.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

// Parse waitlist API response and return appropriate message and action
export const parseWaitlistCheck = (data: {
  isOnWaitlist: boolean;
  isInvited: boolean;
  isActive: boolean;
  firstName?: string;
}): WaitlistCheckResult => {
  const normalizedFirstName = normalizeFirstName(data.firstName);

  if ((data.isOnWaitlist && data.isInvited) || data.isActive) {
    return {
      message: "Welcome aboard! You're ready to set sail.",
      nextAction: "NEXT_BTN",
      firstName: normalizedFirstName ?? "Sailor",
    };
  } else if (data.isOnWaitlist && !data.isInvited) {
    return {
      message:
        "You're on the crew list but not invited yet. We'll let you know when you're invited.",
      nextAction: "SHOW_WAITLIST_BTN",
    };
  } else {
    return {
      message:
        "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
      nextAction: "SHOW_WAITLIST_BTN",
    };
  }
};
