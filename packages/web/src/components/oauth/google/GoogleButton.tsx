// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import GoogleButtonBase from "react-google-button";

export const GoogleButton = ({
  onClick,
  disabled,
  label = "Sign in with Google",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) => {
  return (
    <GoogleButtonBase
      aria-label={label}
      label={label}
      type="light"
      onClick={onClick}
      disabled={disabled}
    />
  );
};
