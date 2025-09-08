import React, { useEffect, useState } from "react";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

const FADE_IN_MS = 4000;
const READ_MS = 3500;
const FADE_OUT_MS = 2000;

/**
 * This step fades the quote in when it comes into view, allows the user a few
 * seconds to read it, and then fades the whole card out. The surrounding
 * `div` handles the fade-out of the entire component while the text itself
 * handles the fade-in.
 */
export const OutroQuote: React.FC<OnboardingStepProps> = ({ onNext }) => {
  const [showText, setShowText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Trigger fade-in very shortly after mount so the transition runs.
    const fadeInTimer = setTimeout(() => setShowText(true), 50);

    // Fade-out after the text has appeared + the allotted read time.
    const fadeOutTimer = setTimeout(
      () => setFadeOut(true),
      50 + FADE_IN_MS + READ_MS,
    );

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  // Once we faded out, call onNext
  useEffect(() => {
    if (fadeOut) {
      setTimeout(
        () => {
          onNext();
        },
        // Wait for the fade out to complete
        FADE_OUT_MS +
          // A little extra time for UX optimization purposes
          500,
      );
    }
  }, [fadeOut, onNext]);

  return (
    <div
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease-in-out`,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OnboardingText
        style={{
          opacity: showText ? 1 : 0,
          transition: `opacity ${FADE_IN_MS}ms ease-in-out`,
        }}
      >
        To reach a port, we must set sail.
        <br />
        Sail, not tie at anchor.
        <br />
        Sail, not drift.
      </OnboardingText>
    </div>
  );
};
