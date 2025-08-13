import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import {
  OnboardingButton,
  OnboardingInput,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingLink,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { useOnboarding } from "../components/OnboardingContext";

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

const TypewriterLine = styled.div`
  font-family: "VT323", monospace;
  font-size: 24px;
  color: ${({ theme }) => theme.color.common.white};
  height: 1.5rem;
  line-height: 1.5rem;
`;

interface TypewriterLinesProps {
  lines: string[];
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypewriterLines: React.FC<TypewriterLinesProps> = ({
  lines,
  speed = 30,
  className = "",
  onComplete,
}) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTypingRef = useRef(false);
  const userInteractedRef = useRef(false);
  const linesRef = useRef<string[]>([]);

  // Calculate the width needed for the longest line
  const maxLineLength = Math.max(...lines.map((line) => line.length));
  const estimatedWidth = `${maxLineLength * 0.6}rem`; // Approximate character width in rem

  // Initialize audio element immediately
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/sounds/typing-continuous.mp3");
      audioRef.current.volume = 0.4;
      audioRef.current.loop = true;
      audioRef.current.preload = "auto";

      // Try to load the audio
      audioRef.current.load();

      // Set up event listeners for when audio is ready
      const handleCanPlay = () => {
        setAudioReady(true);
      };

      audioRef.current.addEventListener("canplaythrough", handleCanPlay);

      // Set up user interaction handler - only listen for keyboard
      const handleKeyInteraction = () => {
        userInteractedRef.current = true;
        setUserInteracted(true);
        document.removeEventListener("keydown", handleKeyInteraction);
      };

      document.addEventListener("keydown", handleKeyInteraction, {
        once: true,
      });

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("canplaythrough", handleCanPlay);
        }
        document.removeEventListener("keydown", handleKeyInteraction);
      };
    }
  }, []);

  // Reset state when lines change
  useEffect(() => {
    // Check if lines actually changed
    const linesChanged =
      JSON.stringify(lines) !== JSON.stringify(linesRef.current);

    if (linesChanged) {
      linesRef.current = lines;

      // Stop any current audio
      if (audioRef.current && isTypingRef.current) {
        audioRef.current.pause();
        isTypingRef.current = false;
      }

      // Reset state
      setDisplayedLines(lines.map(() => ""));
      setCurrentLineIndex(0);
      setCurrentCharIndex(0);
    }
  }, [lines]);

  // Skip animation - show all text immediately
  useEffect(() => {
    if (skipAnimation) {
      setDisplayedLines(lines);
      setCurrentLineIndex(lines.length);
      setCurrentCharIndex(0);
      setTypingComplete(true);
    }
  }, [skipAnimation, lines]);

  // Main typing effect - only start after audio is ready OR after user interaction
  useEffect(() => {
    // Don't start typing until audio is ready AND user has interacted, and not skipping
    if (!audioReady || !userInteracted || skipAnimation) {
      return;
    }

    if (currentLineIndex >= lines.length) {
      // Finished typing all lines - stop audio and mark complete
      if (audioRef.current && isTypingRef.current) {
        audioRef.current.pause();
        isTypingRef.current = false;
      }
      setTypingComplete(true);
      return;
    }

    const currentLine = lines[currentLineIndex];

    if (currentCharIndex < currentLine.length) {
      // Start audio if this is the first character of the first line
      if (
        currentLineIndex === 0 &&
        currentCharIndex === 0 &&
        audioRef.current &&
        !isTypingRef.current &&
        userInteractedRef.current
      ) {
        isTypingRef.current = true;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => {
          console.log("Audio play failed:", error);
          // Continue without audio if it fails
        });
      }

      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          newLines[currentLineIndex] = currentLine.slice(
            0,
            currentCharIndex + 1,
          );
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      // Finished current line
      if (currentLineIndex < lines.length - 1) {
        // More lines to go - pause briefly for line break
        if (audioRef.current && isTypingRef.current) {
          audioRef.current.pause();
          setTimeout(() => {
            if (audioRef.current && isTypingRef.current) {
              audioRef.current.play().catch(() => {
                // Ignore play errors
              });
            }
          }, speed * 2);
        }

        const timer = setTimeout(() => {
          setCurrentLineIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }, speed * 3);

        return () => clearTimeout(timer);
      } else {
        // Finished all lines - stop typing audio after a brief delay
        const timer = setTimeout(() => {
          if (audioRef.current && isTypingRef.current) {
            audioRef.current.pause();
            isTypingRef.current = false;
          }
        }, speed);

        return () => clearTimeout(timer);
      }
    }
  }, [
    currentLineIndex,
    currentCharIndex,
    lines,
    speed,
    audioReady,
    userInteracted,
    skipAnimation,
  ]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isTypingRef.current = false;
    };
  }, []);

  // Add skip functionality during typing
  useEffect(() => {
    if (!userInteracted) return;

    const handleSkipKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !skipAnimation) {
        setSkipAnimation(true);
        // Stop audio
        if (audioRef.current && isTypingRef.current) {
          audioRef.current.pause();
          isTypingRef.current = false;
        }
      }
    };

    document.addEventListener("keydown", handleSkipKey);

    return () => {
      document.removeEventListener("keydown", handleSkipKey);
    };
  }, [userInteracted, skipAnimation]);

  // Handle final key press after typing is complete
  useEffect(() => {
    if (!typingComplete || !onComplete) return;

    const handleFinalKey = () => {
      console.log("Final key pressed, calling onNext");
      onComplete();
    };

    document.addEventListener("keydown", handleFinalKey, { once: true });

    return () => {
      document.removeEventListener("keydown", handleFinalKey);
    };
  }, [typingComplete, onComplete]);

  // Show "Press any key to continue" if audio is ready but user hasn't interacted
  if (audioReady && !userInteracted) {
    return (
      <div
        className={className}
        style={{ width: estimatedWidth, minWidth: "20rem" }}
      >
        <TypewriterLine>Press any key to continue</TypewriterLine>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: estimatedWidth, minWidth: "20rem" }}
    >
      {lines.map((_, index) => (
        <TypewriterLine key={index}>
          {displayedLines[index] || ""}
        </TypewriterLine>
      ))}
    </div>
  );
};

const NotInvited = () => {
  return (
    <OnboardingStepBoilerplate currentStep={1} totalSteps={1}>
      <OnboardingText>You&apos;re not on the crew list yet.</OnboardingText>
      <OnboardingText>
        Sign up to get notified when a spot opens up.
      </OnboardingText>
      <OnboardingLink
        href="https://www.compasscalendar.com/waitlist"
        target="_blank"
        rel="noreferrer"
      >
        JOIN CREW LIST
      </OnboardingLink>
    </OnboardingStepBoilerplate>
  );
};

const OnWaitlistButNotInvited = () => {
  return (
    <OnboardingStepBoilerplate currentStep={1} totalSteps={1}>
      <OnboardingText>
        You&apos;re on the crew list but not invited yet.
      </OnboardingText>
      <OnboardingText>
        We&apos;ll let you know when you&apos;re invited.
      </OnboardingText>
    </OnboardingStepBoilerplate>
  );
};

export const WelcomeStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  const terminalLines = [
    "COMPASS CALENDAR",
    "The weekly planner for minimalists",
    "Copyright (c) 2025. All Rights Reserved",
    "BIOS Version: 20250721",
    "2514 KB",
    "July 23, 2025",
    "15:42:22 UTC",
    "Night Vision Check ... 98% Lanterns Lit",
    "Staff Emergency Contacts ... Secured in Cabin",
    "Initializing Compass Alignment ... Done",
    "Provisions Check ... Sufficient",
    "Rigging Integrity Scan ... All Lines Taut",
    "Chart Room Calibration ... Complete",
    "Crew Roster Verification ... One Missing",
    "Wind Vectors Computed ... Favorable",
    "Final Anchor Check ... Ready to Hoist",
    "Sails Unfurled ... Awaiting Orders",
    "Press Any Key to board",
  ];

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <TypewriterLines lines={terminalLines} speed={50} onComplete={onNext} />
    </OnboardingStepBoilerplate>
  );
};
