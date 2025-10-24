import React, { useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { OnboardingButton } from "./styled";

// Keyframes for pulsing animation
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const IconButton = styled(OnboardingButton)<{ $shouldPulse?: boolean }>`
  padding: 0;
  min-width: 0;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  svg {
    display: block;
  }

  ${({ $shouldPulse }) =>
    $shouldPulse &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
    `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

interface OnboardingNextButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shouldTrapFocus?: boolean;
  shouldPulse?: boolean;
}

export const OnboardingNextButton: React.FC<OnboardingNextButtonProps> = ({
  shouldTrapFocus = false,
  shouldPulse = false,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (shouldTrapFocus && buttonRef.current) {
      // Focus the button when focus trapping is enabled
      buttonRef.current.focus();
    }
  }, [shouldTrapFocus]);

  return (
    <IconButton ref={buttonRef} $shouldPulse={shouldPulse} {...props}>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.95996 0V0.980469H3.91016V1.9502H5.87012V2.92969H7.82031V3.91016H9.76953V4.88965H7.82031V5.87012H5.87012V6.83984H3.91016V7.82031H1.95996V8.7998H0V0H1.95996Z"
          fill="#222222"
        />
      </svg>
    </IconButton>
  );
};

export const OnboardingPreviousButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = (props) => {
  return (
    <IconButton {...props}>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.04004 9V8.01953H6.08984V7.0498L4.12988 7.0498V6.07031H2.17969L2.17969 5.08984L0.230469 5.08984V4.11035H2.17969V3.12988H4.12988V2.16016H6.08984V1.17969L8.04004 1.17969L8.04004 0.200195H10L10 9H8.04004Z"
          fill="#222222"
        />
      </svg>
    </IconButton>
  );
};
