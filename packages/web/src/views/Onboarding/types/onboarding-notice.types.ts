export interface OnboardingNoticeAction {
  label: string;
  onClick: () => void;
}

export interface OnboardingNotice {
  id: string;
  header: string;
  body: string;
  primaryAction?: OnboardingNoticeAction;
  secondaryAction?: OnboardingNoticeAction;
}
