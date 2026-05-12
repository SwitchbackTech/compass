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
      className="my-1 flex min-h-8 w-full cursor-pointer items-center justify-center rounded-default border border-border-primary border-dashed text-text-light-inactive opacity-80 transition-[background-color,border-color,color,opacity] duration-150 hover:border-accent-primary hover:bg-bg-secondary hover:text-text-lighter hover:opacity-100 focus:bg-bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      onClick={onCreate}
      type="button"
    >
      <PlusIcon aria-hidden="true" size={14} weight="bold" />
    </button>
  );
};
