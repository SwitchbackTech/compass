import styled, { keyframes } from "styled-components";
import { c } from "@web/common/styles/colors";
import { Flex } from "@web/components/Flex";

export const Styled = styled(Flex)`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  backdrop-filter: blur(5px);
`;

const spinnerAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export const StyledSpinner = styled.div`
  margin: 60px auto;
  font-size: 4px;
  position: relative;
  text-indent: -9999em;
  border-top: 1.1em solid rgba(255, 255, 255, 0.2);
  border-right: 1.1em solid rgba(255, 255, 255, 0.2);
  border-bottom: 1.1em solid rgba(255, 255, 255, 0.2);
  border-left: 1.1em solid #ffffff;
  transform: translateZ(0);
  animation: ${spinnerAnimation} 1.1s infinite linear;

  border-radius: 50%;
  width: 10em;
  height: 10em;

  &:after {
    border-radius: 50%;
    width: 10em;
    height: 10em;
  }
`;

const progressAnimation = keyframes`
  0% {
    left: -35%;
    right: 100%;
  }
  60% {
    left: 100%;
    right: -90%;
  }
  100% {
    left: 100%;
    right: -90%;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const LoadingMessage = styled.div`
  position: absolute;
  bottom: 40%;
  left: 50%;
  transform: translateX(-50%);
  color: ${c.white100};
  font-size: 16px;
  text-align: center;
  width: 100%;
  max-width: 400px;
  animation: ${fadeIn} 0.8s ease-in-out;

  div {
    margin-bottom: 15px;
  }
`;

export const ProgressBar = styled.div`
  width: 100%;
  height: 3px;
  background-color: ${c.gray800};
  border-radius: 3px;
  overflow: hidden;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, ${c.blue100}, ${c.purple});
    animation: ${progressAnimation} 1.5s ease-in-out infinite;
    width: 45%;
  }
`;
