import { SpinnerGapIcon } from "@phosphor-icons/react";
import { rotateAnimation } from "@web/common/styles/animations/rotate";
import styled from "styled-components";
import { iconStyles } from "./styled";

export const SpinnerIcon = styled(SpinnerGapIcon)`
  ${iconStyles}
  animation: ${rotateAnimation};
`;
