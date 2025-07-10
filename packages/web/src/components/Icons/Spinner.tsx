import styled from "styled-components";
import { SpinnerGap } from "@phosphor-icons/react";
import { rotateAnimation } from "@web/common/styles/animations/rotate";
import { iconStyles } from "./styled";

export const SpinnerIcon = styled(SpinnerGap)`
  ${iconStyles}
  animation: ${rotateAnimation};
`;
