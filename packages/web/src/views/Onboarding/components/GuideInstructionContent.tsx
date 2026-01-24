import { FC } from "react";
import { OnboardingInstructionPart } from "../types/onboarding.guide.types";

const KBD_STYLES =
  "bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs";

interface GuideInstructionContentProps {
  instructionParts: OnboardingInstructionPart[];
}

export const GuideInstructionContent: FC<GuideInstructionContentProps> = ({
  instructionParts,
}) => {
  return (
    <>
      {instructionParts.map((part, index) =>
        part.type === "kbd" ? (
          <kbd key={`${part.value}-${index}`} className={KBD_STYLES}>
            {part.value}
          </kbd>
        ) : (
          <span key={`${part.value}-${index}`}>{part.value}</span>
        ),
      )}
    </>
  );
};

export const GuideSuccessMessage: FC = () => {
  return <>You&apos;re all set!</>;
};
