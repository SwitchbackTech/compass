import React from "react";

const WAITLIST_URL = "https://tylerdane.kit.com/compass-mobile";

export const MobileGate: React.FC = () => {
  const handleJoinWaitlist = () => {
    window.open(WAITLIST_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-bg-primary flex min-h-dvh items-center justify-center p-4">
      <div className="border-border-primary bg-bg-secondary flex w-[400px] max-w-[90vw] flex-col items-center rounded border p-8 text-center">
        <h1 className="mb-6 font-sans text-2xl font-medium text-white">
          Compass isn&apos;t built for mobile yet
        </h1>
        <p className="text-text-light-inactive mb-8 font-sans text-base leading-relaxed">
          We&apos;re focusing on perfecting the web experience first. Join our
          mobile waitlist to be the first to know when we launch.
        </p>
        <button
          onClick={handleJoinWaitlist}
          className="bg-accent-primary focus:outline-accent-primary min-h-[44px] cursor-pointer rounded border-none px-8 py-2 font-sans text-base font-medium text-white transition-opacity duration-300 hover:opacity-90 focus:outline focus:outline-2 focus:outline-offset-2"
        >
          Join Mobile Waitlist
        </button>
      </div>
    </div>
  );
};
