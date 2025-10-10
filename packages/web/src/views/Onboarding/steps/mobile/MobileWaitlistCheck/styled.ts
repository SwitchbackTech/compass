import styled from "styled-components";
import { OnboardingButton, OnboardingText } from "../../../components";

export const WaitlistTitle = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;
