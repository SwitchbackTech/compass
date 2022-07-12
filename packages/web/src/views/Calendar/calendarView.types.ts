import { Dayjs } from "dayjs";

export interface RootProps {
  component: {
    today: Dayjs;
  };
}

export type Category_View = "current" | "pastFuture";
