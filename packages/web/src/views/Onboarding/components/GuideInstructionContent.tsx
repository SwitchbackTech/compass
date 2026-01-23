import { FC } from "react";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
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
  const modifierKey = getModifierKey();
  const modifierKeyDisplay = modifierKey === "Meta" ? "\u2318" : "Ctrl";

  return (
    <>
      You're all set! You can type{" "}
      <kbd className={KBD_STYLES}>{modifierKeyDisplay} + K</kbd> anywhere to
      open the command palette.
    </>
  );
};
