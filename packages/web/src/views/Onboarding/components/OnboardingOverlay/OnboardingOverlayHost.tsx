import { memo } from "react";
import { OnboardingNoticeCard } from "@web/views/Onboarding/components/OnboardingOverlay/OnboardingNoticeCard";
import { useOnboardingNotices } from "@web/views/Onboarding/hooks/useOnboardingNotices";

export const OnboardingOverlayHost = memo(() => {
  const { notices } = useOnboardingNotices();

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-6 bottom-6 z-40 flex max-w-sm flex-col gap-2">
      {notices.map((notice) => (
        <OnboardingNoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  );
});

OnboardingOverlayHost.displayName = "OnboardingOverlayHost";
