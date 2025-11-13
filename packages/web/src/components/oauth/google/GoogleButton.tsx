import React from "react";
import GoogleButtonBase from "react-google-button";

export const GoogleButton = ({
  onClick,
  disabled,
  label = "Sign in with Google",
  style,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <GoogleButtonBase
      aria-label={label}
      label={label}
      type="light"
      onClick={onClick}
      disabled={disabled}
      style={style}
    />
  );
};
