import { type FC, type PropsWithChildren } from "react";
import { CalendarInteractionPointerCaptureBoundary } from "@web/common/calendar-interaction/react/CalendarInteractionPointerCaptureBoundary";
import { type WeekInteractionAdapter } from "./adapter/WeekInteractionAdapter";

interface Props extends PropsWithChildren {
  adapter: WeekInteractionAdapter;
}

export const WeekPointerCaptureBoundary: FC<Props> = ({
  adapter,
  children,
}) => (
  <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
    {children}
  </CalendarInteractionPointerCaptureBoundary>
);
