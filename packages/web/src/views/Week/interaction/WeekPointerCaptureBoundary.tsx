import {
  type FC,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  useEffect,
} from "react";
import { type WeekInteractionAdapter } from "./adapter/WeekInteractionAdapter";

interface Props extends PropsWithChildren {
  adapter: WeekInteractionAdapter;
}

export const WeekPointerCaptureBoundary: FC<Props> = ({
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
