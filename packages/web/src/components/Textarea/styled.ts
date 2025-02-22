import TextareaAutoSize from "react-textarea-autosize";
import styled from "styled-components";
import { TextareaProps } from "./types";

export const StyledTextarea = styled(TextareaAutoSize)<TextareaProps>`
  border: none;
  outline: none;
  font-weight: 600;
  width: 100%;
  resize: none;

  ::placeholder {
    color: ${({ theme }) => theme.color.text.darkPlaceholder};
  }
`;
