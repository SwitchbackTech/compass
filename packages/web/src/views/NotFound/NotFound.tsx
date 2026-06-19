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
        className="mt-5 mb-5 cursor-pointer rounded border-2 border-border-primary bg-fg-primary-dark px-4 py-2 font-semibold text-[16px] text-text-lighter transition-all duration-200 ease-in-out hover:brightness-120"
        onClick={goHome}
        type="button"
      >
        Go back to your booty
      </button>
    </div>
  );
};
