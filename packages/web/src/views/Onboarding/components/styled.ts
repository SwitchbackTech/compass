// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import styled, { css } from "styled-components";

export const OnboardingText = styled.p`
  font-family: "VT323", monospace;
  font-size: 24px;
  color: ${({ theme }) => theme.color.common.white};
`;

export const OnboardingCard = styled.div<{ hideBorder?: boolean }>`
  background-color: #12151b;
  border: ${({ hideBorder }) => (hideBorder ? "none" : "2px solid #ffffff")};
  border-radius: 4px;
  padding: ${({ theme }) => theme.spacing.xl};
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
`;

export const OnboardingContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.l};
`;

export const OnboardingInputContainer = styled.div`
  margin-bottom: 40px;
`;

export const OnboardingInputSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.s};
  padding-bottom: 20px;
`;

export const OnboardingInputLabel = styled.label`
  font-family: "VT323", monospace;
  color: ${({ theme }) => theme.color.common.white};
  font-size: ${({ theme }) => theme.text.size.xxl};
`;
const OnboardingInputBase = css`
  font-family: "VT323", monospace;
  font-size: ${({ theme }) => theme.text.size.xxl};
  width: 100%;
  background: transparent;
  color: ${({ theme }) => theme.color.common.white};
  border: 1px solid ${({ theme }) => theme.color.common.white};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: ${({ theme }) => theme.spacing.s} ${({ theme }) => theme.spacing.m};
  transition: border-color ${({ theme }) => theme.transition.default};

  &::placeholder {
    color: ${({ theme }) => theme.color.text.darkPlaceholder};
  }
  &:focus {
    border-color: ${({ theme }) => theme.color.text.accent};
  }
`;

export const OnboardingInput = styled.input`
  ${OnboardingInputBase}
`;

export const OnboardingTextarea = styled.textarea`
  ${OnboardingInputBase}
`;

export const OnboardingTextareaWhite = styled(OnboardingTextarea)`
  background-color: ${({ theme }) => theme.color.common.white};
  border-radius: 0;
  color: ${({ theme }) => theme.color.common.black};
  box-shadow:
    rgb(95 95 95) 1px 1px 0px 1px inset,
    rgb(255 255 255) 1px 1px 0px 1px;
`;

export const ProgressIndicator = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  margin-top: ${({ theme }) => theme.spacing.l};
`;

export const ProgressDot = styled.div<{ isActive: boolean }>`
  width: 14px;
  height: 20px;
  border-bottom: 2px solid ${({ theme }) => theme.color.common.white};
  border-left: 2px solid rgb(163 163 163);
  border-top: 2px solid rgb(163 163 163);
  border-right: 2px solid ${({ theme }) => theme.color.common.white};
  border-radius: 2px;
  background-color: ${({ isActive, theme }) =>
    isActive ? theme.color.text.accent : "#395264"};
  transition: background-color ${({ theme }) => theme.transition.default};
`;

export const OnboardingButton = styled.button`
  font-family: "VT323", monospace;
  border: none;
  border-radius: 0;
  padding: ${({ theme }) => theme.spacing.s} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.text.size.m};
  cursor: pointer;
  min-width: 80px;
  background-color: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};

  &:hover {
    background: #d4d4d4;
  }

  &:disabled {
    background: #888888;
    cursor: not-allowed;
  }

  &:focus {
    outline: 1px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 1px;
  }
`;

export const OnboardingLink = styled.a`
  font-family: "VT323", monospace;
  color: #222222;
  text-decoration: none;
  font-size: ${({ theme }) => theme.text.size.m};
  background: #c0c0c0;
  padding: 8px 8px;
  display: inline-block;
  position: relative;
  border: none;
  box-shadow:
    inset -2px -2px #808080,
    inset 2px 2px #dfdfdf,
    inset -1px -1px #0a0a0a,
    inset 1px 1px #ffffff;
  cursor: pointer;

  &:active {
    box-shadow:
      inset 2px 2px #808080,
      inset -2px -2px #dfdfdf,
      inset 1px 1px #0a0a0a,
      inset -1px -1px #ffffff;
  }
`;
