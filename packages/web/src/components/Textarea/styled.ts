import styled from "styled-components";
import TextareaAutoSize from "react-textarea-autosize";
import { inputBaseStyles } from "@web/common/styles/components";

import { Props } from "./types";

export const Styled = styled(TextareaAutoSize)<Props>`
  ${inputBaseStyles}
  border: none;
  outline: none;
  font-weight: 600;
  width: 100%;
  resize: none;
`;
