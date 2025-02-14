import React from "react";
import { IconButtonProps, StyledIconButton } from "./styled";

const IconButton: React.FC<IconButtonProps> = ({
  size = "medium",
  children: icon,
  ...props
}) => {
  return (
    <StyledIconButton size={size} {...props}>
      {icon}
    </StyledIconButton>
  );
};

export default IconButton;
