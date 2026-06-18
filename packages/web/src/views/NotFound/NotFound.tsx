import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Text } from "@web/components/Text/Text";

export const NotFoundView = () => {
  const navigate = useNavigate();

  const goHome = () => navigate(ROOT_ROUTES.ROOT);

  return (
    <div className="c-not-found">
      <div>
        <Text size="4xl">🏴‍☠️ Shiver me timbers! </Text>
      </div>

      <div>
        <Text size="xxl">This isn't part of the app, matey</Text>
      </div>

      <button
        className="c-not-found-back-button"
        onClick={goHome}
        type="button"
      >
        Go back to your booty
      </button>
    </div>
  );
};
