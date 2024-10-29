import styled from "styled-components";
import TextareaAutoSize from "react-textarea-autosize";

import { Props } from "./types";

export const Styled = styled(TextareaAutoSize)<Props>`
  border: none;
  outline: none;
  font-weight: 600;
  width: 100%;
  resize: none;

  ::placeholder {
    color: ${({ theme }) => theme.color.text.darkPlaceholder};
  }
`;
