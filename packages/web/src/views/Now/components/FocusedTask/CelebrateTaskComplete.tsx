export function CelebrateTaskComplete({ celebrate }: { celebrate: boolean }) {
  if (!celebrate) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-16 w-16 animate-ping items-center justify-center rounded-full bg-green-500">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
    </div>
  );
}
