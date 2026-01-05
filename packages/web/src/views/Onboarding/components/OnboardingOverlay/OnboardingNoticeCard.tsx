import type { OnboardingNotice } from "@web/views/Onboarding/types/onboarding-notice.types";

interface OnboardingNoticeCardProps {
  notice: OnboardingNotice;
}

export const OnboardingNoticeCard = ({ notice }: OnboardingNoticeCardProps) => {
  const { header, body, primaryAction, secondaryAction } = notice;

  return (
    <div className="bg-bg-primary border-border-primary rounded-lg border p-4 shadow-lg">
      <div className="mb-3">
        <h3 className="text-text-light mb-1 text-lg font-semibold">{header}</h3>
        <p className="text-text-light/80 text-sm">{body}</p>
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-2">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="border-border-primary bg-bg-secondary text-text-light hover:bg-bg-tertiary rounded border px-4 py-2 text-sm font-medium transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
