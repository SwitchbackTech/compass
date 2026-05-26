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
      className="my-0.5 flex h-[30px] w-full cursor-pointer items-center gap-1.5 rounded-default px-2 text-[11px] text-text-light-inactive transition-[background-color,color] duration-150 hover:bg-bg-secondary hover:text-text-lighter focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      onClick={onCreate}
      type="button"
    >
      <PlusIcon aria-hidden="true" size={14} weight="bold" />
      <span>Add item</span>
    </button>
  );
};
