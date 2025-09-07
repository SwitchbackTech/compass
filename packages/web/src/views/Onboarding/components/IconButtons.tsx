import React from "react";
import styled from "styled-components";
import { OnboardingButton } from "./styled";

const IconButton = styled(OnboardingButton)`
  padding: 0;
  min-width: 0;
  width: 24px;
  height: 24px;
`;

export const OnboardingNextButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  return (
    <IconButton {...props}>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.95996 0V0.980469H3.91016V1.9502H5.87012V2.92969H7.82031V3.91016H9.76953V4.88965H7.82031V5.87012H5.87012V6.83984H3.91016V7.82031H1.95996V8.7998H0V0H1.95996Z"
          fill="#222222"
        />
      </svg>
    </IconButton>
  );
};

export const OnboardingPreviousButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  return (
    <IconButton {...props}>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.04004 9V8.01953H6.08984V7.0498L4.12988 7.0498V6.07031H2.17969L2.17969 5.08984L0.230469 5.08984V4.11035H2.17969V3.12988H4.12988V2.16016H6.08984V1.17969L8.04004 1.17969L8.04004 0.200195H10L10 9H8.04004Z"
          fill="#222222"
        />
      </svg>
    </IconButton>
  );
};
