import { type ReactNode } from "react";

interface TitleActionsRowProps {
  actions: ReactNode;
  title: ReactNode;
}

export const TitleActionsRow = ({ actions, title }: TitleActionsRowProps) => (
  <div className="mb-2.5 flex items-start gap-3">
    <div className="min-w-0 flex-1">{title}</div>
    <div className="shrink-0">{actions}</div>
  </div>
);
