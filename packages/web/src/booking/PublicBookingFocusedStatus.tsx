import { useEffect, useRef } from "react";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";

interface PublicBookingFocusedStatusProps {
  title: string;
  description: string;
}

export function PublicBookingFocusedStatus({
  title,
  description,
}: PublicBookingFocusedStatusProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: remount or title change
  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

  return (
    <PublicBookingStatusMessage
      headingRef={headingRef}
      title={title}
      description={description}
    />
  );
}
