import type React from "react";

const WAITLIST_URL = "https://tylerdane.kit.com/compass-mobile";

export const MobileGate: React.FC = () => {
  const handleJoinWaitlist = () => {
    window.open(WAITLIST_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-primary p-4">
      <div className="flex w-[400px] max-w-[90vw] flex-col items-center rounded border border-border-primary bg-bg-secondary p-8 text-center">
        <h1 className="mb-6 font-medium font-sans text-2xl text-white">
          Compass isn&apos;t built for mobile yet
        </h1>
        <p className="mb-8 font-sans text-base text-text-light-inactive leading-relaxed">
          We&apos;re focusing on perfecting the web experience first. Join our
          mobile waitlist to be the first to know when we launch.
        </p>
        <button
          onClick={handleJoinWaitlist}
          className="min-h-[44px] cursor-pointer rounded border-none bg-accent-primary px-8 py-2 font-medium font-sans text-base text-white transition-opacity duration-300 hover:opacity-90 focus:outline focus:outline-2 focus:outline-accent-primary focus:outline-offset-2"
        >
          Join Mobile Waitlist
        </button>
      </div>
    </div>
  );
};
