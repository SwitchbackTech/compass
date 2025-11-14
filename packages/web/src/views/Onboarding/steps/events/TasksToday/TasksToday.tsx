import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";
import { OnboardingCardLayout } from "@web/views/Onboarding/components/layouts/OnboardingCardLayout";
import { OnboardingText } from "@web/views/Onboarding/components/styled";

export const TasksToday: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
    >
      <OnboardingText>TasksToday</OnboardingText>
    </OnboardingCardLayout>
  );
};
