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
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  transition: ${({ theme }) => theme.transition.default};
  font-size: ${({ size = "medium" }) => sizeMap[size]}px;
  border: 2px solid transparent;

  &:hover {
    transform: scale(1.05);
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
  }
`;
