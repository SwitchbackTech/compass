import { Link } from "@tanstack/react-router";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export const NotFoundView = () => {
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

      <Link
        to={ROOT_ROUTES.ROOT}
        className="mt-5 mb-5 inline-block cursor-pointer rounded border-2 border-border-primary bg-fg-primary-dark px-4 py-2 font-semibold text-[16px] text-text-lighter transition-all duration-200 ease-in-out hover:brightness-120"
      >
        Go back to your booty
      </Link>
    </div>
  );
};
