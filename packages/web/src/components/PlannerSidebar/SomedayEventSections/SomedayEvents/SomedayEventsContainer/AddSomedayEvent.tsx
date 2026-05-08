export const AddSomedayEvent = ({ onCreate }: { onCreate: () => void }) => {
  return (
    <button
      aria-label="Add someday event"
      className="my-0.5 flex min-h-9 w-full cursor-pointer items-center justify-center rounded-default border border-border-primary border-dashed text-text-light-inactive opacity-70 transition hover:border-accent-primary hover:text-text-lighter hover:opacity-100 focus:bg-bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      onClick={onCreate}
      type="button"
    >
      <span className="text-base leading-none">+</span>
    </button>
  );
};
