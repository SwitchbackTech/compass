import {
  type FC,
  type PropsWithChildren,
  type PointerEvent as ReactPointerEvent,
  useEffect,
} from "react";
import { type CalendarInteractionCancellationTargets } from "../CalendarInteractionEngine";

export interface CalendarPointerCaptureAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): {
    reason: string;
    shouldOwn: boolean;
  };
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
}

interface Props extends PropsWithChildren {
  adapter: CalendarPointerCaptureAdapter;
}

export const CalendarInteractionPointerCaptureBoundary: FC<Props> = ({
  adapter,
  children,
}) => {
  useEffect(() => {
    const disconnectCancellationEvents = adapter.connectCancellationEvents();

    return () => {
      adapter.cancel();
      disconnectCancellationEvents();
    };
  }, [adapter]);

  const handlePointerDownCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const ownership = adapter.handlePointerDown(event.nativeEvent);

    if (!ownership.shouldOwn) {
      return;
    }

    consumeOwnedPointerEvent(event);
  };

  const handlePointerMoveCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (adapter.handlePointerMove(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  const handlePointerUpCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (adapter.handlePointerUp(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  const handlePointerCancelCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (adapter.handlePointerCancel(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  return (
    <div
      onPointerCancelCapture={handlePointerCancelCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
};

const consumeOwnedPointerEvent = (
  event: Pick<
    ReactPointerEvent<HTMLDivElement>,
    "preventDefault" | "stopPropagation"
  >,
) => {
  event.preventDefault();
  event.stopPropagation();
};
