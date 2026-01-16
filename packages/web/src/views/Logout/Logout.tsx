import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { session } from "@web/common/classes/Session";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { StyledLogoutBtn, StyledLogoutContainer } from "./styled";

export const LogoutView = () => {
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);

    await session.signOut();

    setIsLoggingOut(false);

    alert("You logged out - see ya! ✌");
    navigate(ROOT_ROUTES.DAY);
  };

  return (
    <StyledLogoutContainer
      alignItems={AlignItems.CENTER}
      direction={FlexDirections.COLUMN}
    >
      {isLoggingOut && <AbsoluteOverflowLoader />}

      <StyledLogoutBtn role="button" onClick={() => void logout()}>
        Signout
      </StyledLogoutBtn>
    </StyledLogoutContainer>
  );
};
