import { type FC } from "react";

interface Props {
  count: number;
  label: string;
}

export const SomedaySectionHeader: FC<Props> = ({ count, label }) => {
  return (
    <div className="mb-2 flex min-h-[18px] items-center justify-between gap-2">
      <h2 className="min-w-0 truncate font-semibold text-sm text-text-lighter leading-none">
        {label}
      </h2>
      {count > 0 ? (
        <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-panel-badge-bg px-1.5 text-[11px] text-text-light-inactive tabular-nums leading-none">
          {count}
          <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
        </span>
      ) : null}
    </div>
  );
};
