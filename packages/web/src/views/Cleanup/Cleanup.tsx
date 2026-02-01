import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { clearAllBrowserStorage } from "@web/common/utils/cleanup/browser.cleanup.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { StyledLogin } from "../Login/styled";

const REDIRECT_DELAY_MS = 2000;

export const CleanupView = () => {
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performCleanup = async () => {
      try {
        await clearAllBrowserStorage();
        setIsClearing(false);
        // Show success message before redirecting
        setTimeout(() => {
          navigate(ROOT_ROUTES.LOGIN);
        }, REDIRECT_DELAY_MS);
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
        <div className="p-8 text-center text-xl">
          Browser data cleared successfully!
          <div className="mt-4 text-sm text-gray-500">
            Redirecting to login...
          </div>
        </div>
      )}

      {error && <div className="p-8 text-center text-xl">{error}</div>}
    </StyledLogin>
  );
};
