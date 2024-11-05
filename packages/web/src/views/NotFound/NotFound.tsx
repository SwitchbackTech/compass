import React from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Text } from "@web/components/Text";
import notFoundImg from "@web/assets/png/notFound.png";

import {
  StyledBackButton,
  StyledNotFoundContainer,
  StyledNotFoundImg,
} from "./styled";

export const NotFoundView = () => {
  const navigate = useNavigate();

  const goHome = () => navigate(ROOT_ROUTES.ROOT);

  return (
    <StyledNotFoundContainer>
      <div>
        <Text size={38}>🏴‍☠️ Shiver me timbers! </Text>
      </div>

      <div>
        <Text size={22}>This isn't part of the app, matey</Text>
      </div>

      <StyledBackButton onClick={goHome}>
        Go back to your booty
      </StyledBackButton>

      <StyledNotFoundImg src={notFoundImg} alt="Ship wrecked" width="600px" />
    </StyledNotFoundContainer>
  );
};
