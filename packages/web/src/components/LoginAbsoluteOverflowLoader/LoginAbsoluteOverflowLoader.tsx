import classNames from "classnames";
import { type HTMLAttributes, useEffect, useState } from "react";

/**
 * Absolute overflow loader customized to handle login flow
 */
export const LoginAbsoluteOverflowLoader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
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
    <div
      className={classNames(
        "c-overflow-loader flex items-center justify-center",
        className,
      )}
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
    </div>
  );
};

// 1st msg
const MESSAGE_TEXT = "This can take a while. Please hang tight.";
const MESSAGE_TIMEOUT = 7000;

// 2nd msg
const SECOND_MESSAGE_TEXT =
  "Almost there! We're finalizing your calendar setup.";
const SECOND_MESSAGE_TIMEOUT = 15000;
