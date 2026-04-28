import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Text } from "@web/components/Text";
import { StyledBackButton, StyledNotFoundContainer } from "./styled";

export const NotFoundView = () => {
  const navigate = useNavigate();

  const goHome = () => navigate(ROOT_ROUTES.ROOT);

  return (
    <StyledNotFoundContainer>
      <div>
        <Text size="4xl">🏴‍☠️ Shiver me timbers! </Text>
      </div>

      <div>
        <Text size="xxl">This isn't part of the app, matey</Text>
      </div>

      <StyledBackButton onClick={goHome}>
        Go back to your booty
      </StyledBackButton>
    </StyledNotFoundContainer>
  );
};
