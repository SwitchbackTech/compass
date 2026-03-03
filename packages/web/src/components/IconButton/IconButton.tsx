import type React from "react";
import { type IconButtonProps, StyledIconButton } from "./styled";

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
