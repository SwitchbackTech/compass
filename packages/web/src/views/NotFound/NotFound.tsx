import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export const NotFoundView = () => {
  const navigate = useNavigate();

  const goHome = () => navigate(ROOT_ROUTES.ROOT);

  return (
    <div className="c-not-found">
      <div>
        <span className="relative text-4xl">🏴‍☠️ Shiver me timbers! </span>
      </div>

      <div>
        <span className="relative text-xxl">
          This isn't part of the app, matey
        </span>
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
