interface PublicBookingSlotsLiveStatusProps {
  message: string;
}

export function PublicBookingSlotsLiveStatus({
  message,
}: PublicBookingSlotsLiveStatusProps) {
  return (
    <p aria-live="polite" className="sr-only" role="status">
      {message}
    </p>
  );
}
