import { FC } from "react";

interface GuideSkipButtonProps {
  onClick: () => void;
  showSuccessMessage: boolean;
  isNowViewOverlay: boolean;
}

export const GuideSkipButton: FC<GuideSkipButtonProps> = ({
  onClick,
  showSuccessMessage,
  isNowViewOverlay,
}) => {
  const ariaLabel = showSuccessMessage ? "Dismiss" : "Skip guide";

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 transition-colors ${
        isNowViewOverlay
          ? "text-text-lighter hover:text-text-light ml-4 text-sm font-medium"
          : "text-text-light/60 hover:text-text-light"
      }`}
      aria-label={ariaLabel}
    >
      {isNowViewOverlay ? (
        "Skip"
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  );
};
