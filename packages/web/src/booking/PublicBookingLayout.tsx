import { type PropsWithChildren } from "react";

export function PublicBookingLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-background text-text">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
        {children}
      </main>
    </div>
  );
}
