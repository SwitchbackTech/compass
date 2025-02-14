import styled from "styled-components";

export type IconButtonSize = "small" | "medium" | "large";

const sizeMap: Record<IconButtonSize, number> = {
  small: 20,
  medium: 27,
  large: 34,
};

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
}

const buttonStyleReset = `
	background: none;
	color: inherit;
	border: none;
	padding: 0;
	font: inherit;
	cursor: pointer;
	outline: inherit;
`;

export const StyledIconButton = styled.button<IconButtonProps>`
  ${buttonStyleReset}
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease, transform 0.2s ease;
  font-size: ${({ size = "medium" }) => sizeMap[size]}px;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
