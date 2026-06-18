import { useEffect, useState } from "react";
import {
  AlignItems,
  Flex,
  type FlexProps,
  JustifyContent,
} from "@web/components/Flex/Flex";

/**
 * Absolute overflow loader customized to handle login flow
 */
export const LoginAbsoluteOverflowLoader = (props: FlexProps) => {
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
    <Flex
      className="c-overflow-loader"
      justifyContent={JustifyContent.CENTER}
      alignItems={AlignItems.CENTER}
      {...props}
    >
      <div className="c-loader-spinner" />
      {showMessage && (
        <div
          className="absolute bottom-2/5 left-1/2 w-full max-w-100 -translate-x-1/2 animate-login-message-in text-center text-l text-text-lighter"
          key={currentMessage}
        >
          <div className="mb-3.75">{currentMessage}</div>
          <div className="c-login-progress" />
        </div>
      )}
    </Flex>
  );
};

// 1st msg
const MESSAGE_TEXT = "This can take a while. Please hang tight.";
const MESSAGE_TIMEOUT = 7000;

// 2nd msg
const SECOND_MESSAGE_TEXT =
  "Almost there! We're finalizing your calendar setup.";
const SECOND_MESSAGE_TIMEOUT = 15000;
