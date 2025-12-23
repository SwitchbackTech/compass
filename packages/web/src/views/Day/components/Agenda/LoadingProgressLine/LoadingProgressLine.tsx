/**
 * Loading progress line component that shows at the top of the viewport
 * during subsequent event reloads. Displays an animated color-transitioning
 * line that indicates loading state without obstructing the user's view.
 */
export function LoadingProgressLine() {
  return (
    <div
      data-testid="loading-progress-line"
      className="fixed top-0 right-0 left-0 z-50 h-1"
      style={{
        background:
          "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
        backgroundSize: "200% 100%",
        animation: "progressSlide 2s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes progressSlide {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
