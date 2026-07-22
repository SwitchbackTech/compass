interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const AllDayToggle = ({ checked, onChange }: Props) => (
  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-text-muted">
    <input
      checked={checked}
      className="size-4 accent-accent"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
    All day?
  </label>
);
