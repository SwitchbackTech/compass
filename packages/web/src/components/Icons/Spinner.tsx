import { SpinnerGapIcon } from "@phosphor-icons/react";
import styled from "styled-components";
import { rotateAnimation } from "@web/common/styles/animations/rotate";
import { iconStyles } from "./styled";

export const SpinnerIcon = styled(SpinnerGapIcon)`
  ${iconStyles}
  animation: ${rotateAnimation};
`;
