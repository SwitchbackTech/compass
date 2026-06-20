import { type ReactNode } from "react";

interface DescriptionActionsRowProps {
  actions: ReactNode;
  description: ReactNode;
}

export const DescriptionActionsRow = ({
  actions,
  description,
}: DescriptionActionsRowProps) => (
  <div className="mb-2.5 flex items-start gap-7.5">
    <div className="min-w-0 flex-1">{description}</div>
    <div className="shrink-0">{actions}</div>
  </div>
);
