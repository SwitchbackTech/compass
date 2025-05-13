import React, { useEffect, useState } from "react";
import { AlignItems, JustifyContent, Props } from "@web/components/Flex/styled";
import { LoadingMessage, ProgressBar, Styled, StyledSpinner } from "./styled";

/**
 * Absolute overflow loader customized to handle login flow
 */
export const LoginAbsoluteOverflowLoader = (props: Props) => {
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(MESSAGE_TEXT);

  useEffect(() => {
    const firstTimer = setTimeout(() => {
      setShowMessage(true);
    }, MESSAGE_TIMEOUT);

    const secondTimer = setTimeout(() => {
      setCurrentMessage(SECOND_MESSAGE_TEXT);
    }, MESSAGE_TIMEOUT + SECOND_MESSAGE_TIMEOUT);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, []);

  return (
    <Styled
      justifyContent={JustifyContent.CENTER}
      alignItems={AlignItems.CENTER}
      {...props}
    >
      <StyledSpinner />
      {showMessage && (
        <LoadingMessage key={currentMessage}>
          <div>{currentMessage}</div>
          <ProgressBar />
        </LoadingMessage>
      )}
    </Styled>
  );
};

// 1st msg
const MESSAGE_TEXT = "This can take a while. Please hang tight.";
const MESSAGE_TIMEOUT = 7000;

// 2nd msg
const SECOND_MESSAGE_TEXT =
  "Almost there! We're finalizing your calendar setup.";
const SECOND_MESSAGE_TIMEOUT = 15000;
