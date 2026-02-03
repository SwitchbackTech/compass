import React from "react";
import styled from "styled-components";

const WAITLIST_URL = "https://tylerdane.kit.com/compass-mobile";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: ${({ theme }) => theme.color.bg.primary};
  padding: ${({ theme }) => theme.spacing.m};
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.color.bg.secondary};
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: ${({ theme }) => theme.spacing.xl};
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const Title = styled.h1`
  font-family: "Rubik", sans-serif;
  font-size: 24px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0 0 ${({ theme }) => theme.spacing.l};
`;

const Message = styled.p`
  font-family: "Rubik", sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #a0a0a0;
  margin: 0 0 ${({ theme }) => theme.spacing.xl};
  line-height: 1.6;
`;

const WaitlistButton = styled.button`
  font-family: "Rubik", sans-serif;
  font-size: 16px;
  font-weight: 500;
  min-height: 44px;
  padding: ${({ theme }) => theme.spacing.s} ${({ theme }) => theme.spacing.xl};
  background-color: ${({ theme }) => theme.color.text.accent};
  color: ${({ theme }) => theme.color.common.white};
  border: none;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  cursor: pointer;
  transition: opacity ${({ theme }) => theme.transition.default};

  &:hover {
    opacity: 0.9;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }
`;

export const MobileGate: React.FC = () => {
  const handleJoinWaitlist = () => {
    window.open(WAITLIST_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <Container>
      <Card>
        <Title>Compass isn&apos;t built for mobile yet</Title>
        <Message>
          We&apos;re focusing on perfecting the web experience first. Join our
          mobile waitlist to be the first to know when we launch.
        </Message>
        <WaitlistButton onClick={handleJoinWaitlist}>
          Join Mobile Waitlist
        </WaitlistButton>
      </Card>
    </Container>
  );
};
