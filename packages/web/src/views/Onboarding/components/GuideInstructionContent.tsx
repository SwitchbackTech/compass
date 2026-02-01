import { FC } from "react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";
import { ImportResults } from "@web/ducks/events/slices/sync.slice";
import { OnboardingInstructionPart } from "../types/onboarding.guide.types";

const KBD_STYLES =
  "bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs";

interface GuideInstructionContentProps {
  instructionParts: OnboardingInstructionPart[];
}

interface GuideSuccessMessageProps {
  importResults?: ImportResults | null;
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

const formatImportMessage = (
  importResults: ImportResults,
): { mainLine: string | null; secondaryLine: string | null } => {
  const { eventsCount, calendarsCount, localEventsSynced } = importResults;
  let mainLine: string | null = null;
  let secondaryLine: string | null = null;

  // Google Calendar import line
  const importParts = [];
  if (eventsCount !== undefined) {
    importParts.push(`${eventsCount} event${eventsCount !== 1 ? "s" : ""}`);
  }
  if (calendarsCount !== undefined) {
    importParts.push(
      `${calendarsCount} calendar${calendarsCount !== 1 ? "s" : ""}`,
    );
  }
  if (importParts.length > 0) {
    mainLine = `Imported ${importParts.join(" from ")}`;
  }

  // Local events sync line
  if (localEventsSynced !== undefined && localEventsSynced > 0) {
    secondaryLine = `${localEventsSynced} local event${localEventsSynced !== 1 ? "s" : ""} synced to the cloud`;
  }

  return { mainLine, secondaryLine };
};

export const GuideSuccessMessage: FC<GuideSuccessMessageProps> = ({
  importResults,
}) => {
  if (importResults) {
    const { mainLine, secondaryLine } = formatImportMessage(importResults);

    if (!mainLine && !secondaryLine) {
      return <>Your calendar has been synced successfully!</>;
    }

    return (
      <>
        {mainLine && <span>{mainLine}</span>}
        {mainLine && secondaryLine && <br />}
        {secondaryLine && <span>{secondaryLine}</span>}
      </>
    );
  }

  return <>You&apos;re all set!</>;
};
