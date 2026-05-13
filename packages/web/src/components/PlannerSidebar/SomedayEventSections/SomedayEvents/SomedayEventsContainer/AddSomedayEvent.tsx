import { PlusIcon } from "@phosphor-icons/react";

export const AddSomedayEvent = ({
  ariaLabel,
  onCreate,
}: {
  ariaLabel: string;
  onCreate: () => void;
}) => {
  return (
    <button
      aria-label={ariaLabel}
      className="my-1 flex min-h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-default border border-text-light-inactive/40 border-dashed font-medium text-[11px] text-text-light transition-[background-color,border-color,color] duration-150 hover:border-accent-primary hover:bg-bg-secondary hover:text-text-lighter focus:bg-bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      onClick={onCreate}
      type="button"
    >
      <PlusIcon aria-hidden="true" size={14} weight="bold" />
      <span>{ariaLabel}</span>
    </button>
  );
};
