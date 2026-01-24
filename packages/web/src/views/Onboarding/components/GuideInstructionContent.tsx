import { FC } from "react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";
import { OnboardingInstructionPart } from "../types/onboarding.guide.types";

const KBD_STYLES =
  "bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs";

interface GuideInstructionContentProps {
  instructionParts: OnboardingInstructionPart[];
}

const getMetaKeyLabel = (): string => {
  const os = getDesktopOS();
  return os === DesktopOS.MacOS ? "⌘" : "Ctrl";
};

export const GuideInstructionContent: FC<GuideInstructionContentProps> = ({
  instructionParts,
}) => {
  return (
    <>
      {instructionParts.map((part, index) => {
        if (part.type === "kbd") {
          return (
            <kbd key={`kbd-${part.value}-${index}`} className={KBD_STYLES}>
              {part.value}
            </kbd>
          );
        }
        if (part.type === "meta-key") {
          return (
            <kbd key={`meta-key-${index}`} className={KBD_STYLES}>
              {getMetaKeyLabel()}
            </kbd>
          );
        }
        return <span key={`text-${part.value}-${index}`}>{part.value}</span>;
      })}
    </>
  );
};

export const GuideSuccessMessage: FC = () => {
  return <>You&apos;re all set!</>;
};
