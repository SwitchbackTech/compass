import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { clearAllBrowserStorage } from "@web/common/utils/cleanup/browserCleanup.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { StyledLogin } from "../Login/styled";
import { StyledCleanupMessage } from "./styled";

export const CleanupView = () => {
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performCleanup = async () => {
      try {
        await clearAllBrowserStorage();
        setIsClearing(false);
        // Show success message for 2 seconds before redirecting
        setTimeout(() => {
          navigate(ROOT_ROUTES.LOGIN);
        }, 2000);
      } catch (err) {
        setIsClearing(false);
        setError(
          "Failed to clear browser storage. Please try manually clearing your browser data.",
        );
        console.error("Cleanup error:", err);
      }
    };

    void performCleanup();
  }, [navigate]);

  return (
    <StyledLogin
      alignItems={AlignItems.CENTER}
      direction={FlexDirections.COLUMN}
    >
      {isClearing && <AbsoluteOverflowLoader />}

      {!isClearing && !error && (
        <StyledCleanupMessage>
          ✅ Browser data cleared successfully!
          <br />
          <small>Redirecting to login...</small>
        </StyledCleanupMessage>
      )}

      {error && <StyledCleanupMessage>❌ {error}</StyledCleanupMessage>}
    </StyledLogin>
  );
};
