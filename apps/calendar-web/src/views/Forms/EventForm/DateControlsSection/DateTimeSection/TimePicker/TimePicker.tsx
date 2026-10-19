import { useEffect, useId, useRef } from "react";
import { flushSync } from "react-dom";
import { type CSSObjectWithLabel, type Props as RSProps } from "react-select";
import CreatableSelect from "react-select/creatable";
import { Z_INDEX_FLOATING_MENU } from "@web/common/constants/web.constants";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";
import {
  filterTimeOption,
  type ParseUserTimeOptions,
  parseUserTime,
} from "@web/common/utils/datetime/web.date.util";
import { resolveFormControlJumpIds } from "@web/common/utils/form/form.util";
import { useFloatingLayer } from "@web/shortcuts/floating-layer";
import { resolveTimePickerSelection } from "./resolveTimePickerSelection";
import { TIME_PICKER_COMMIT_DRAFT_EVENT } from "./timePickerCommitDraft";

export interface Props extends Omit<RSProps, "onChange" | "value"> {
  complementaryTime?: string;
  isMenuOpen: boolean;
  onChange: (option: SelectOption<string>) => void;
  options?: TimeOption[];
  pickerRole?: ParseUserTimeOptions["role"];
  selectClassName?: string;
  /** Kept in an effect dependency list below, so pass a stable callback. */
  setIsMenuOpen: (isOpen: boolean) => void;
  value: SelectOption<string>;
}

// react-select's default neutral80 is hsl(0,0%,20%) / #333. Class-based CSS
// in .c-time-picker loses to emotion style objects for these roles — same
// recipe as FreqSelect.
const themeColor =
  (cssVar: string) =>
  (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    color: cssVar,
  });

const timePickerTextStyles = {
  singleValue: themeColor("var(--text)"),
  input: themeColor("var(--text)"),
  placeholder: themeColor("var(--text-muted)"),
  // The menu portals to document.body, outside .c-time-picker, so its
  // chrome lives here. Fit the longest label ("12:45 PM") without wrapping.
  menu: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    width: "max-content",
    minWidth: "100%",
    border: "1px solid var(--color-border)",
    borderRadius: 2,
    backgroundColor: "var(--surface)",
  }),
  menuList: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    padding: 0,
    fontSize: "var(--font-size-m)",
  }),
  menuPortal: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    zIndex: Z_INDEX_FLOATING_MENU,
  }),
  option: (
    base: CSSObjectWithLabel,
    { isFocused, isSelected }: { isFocused: boolean; isSelected: boolean },
  ): CSSObjectWithLabel => ({
    ...base,
    whiteSpace: "nowrap",
    color: isFocused ? "var(--on-accent)" : "var(--text)",
    backgroundColor: isFocused
      ? "var(--accent)"
      : isSelected
        ? "var(--surface-raised)"
        : "transparent",
  }),
};

const TIMEPICKER = "timepicker";

const MENU_NAV_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** The menu portals to document.body, so reach it through the combobox. */
function comboboxFromContainer(
  container: HTMLElement | null,
): HTMLElement | null {
  return container?.querySelector<HTMLElement>('[role="combobox"]') ?? null;
}

function menuListbox(container: HTMLElement | null): HTMLElement | null {
  const listboxId =
    comboboxFromContainer(container)?.getAttribute("aria-controls");
  return listboxId ? document.getElementById(listboxId) : null;
}

function optionFromFocusedMenu(
  container: HTMLElement | null,
  options: TimeOption[] | undefined,
  parseContext: ParseUserTimeOptions,
): TimeOption | undefined {
  const combobox = comboboxFromContainer(container);
  const activeId = combobox?.getAttribute("aria-activedescendant");
  const focusedEl = activeId
    ? document.getElementById(activeId)
    : menuListbox(container)?.getElementsByClassName(
        `${TIMEPICKER}__option--is-focused`,
      )[0];
  const focusedLabel = focusedEl?.textContent?.trim();
  if (!focusedLabel) return undefined;

  const listed = options?.find((option) => option.label === focusedLabel);
  if (listed) return listed;

  const created = parseUserTime(focusedLabel, parseContext);
  return created?.label === focusedLabel ? created : undefined;
}

export const TimePicker = ({
  complementaryTime,
  isMenuOpen,
  onChange: _onChange,
  options,
  pickerRole,
  selectClassName,
  setIsMenuOpen,
  value,
  id,
  inputId,
  ...props
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const userAdjustedRef = useRef(false);
  const remapEnterRef = useRef(false);
  const layerId = useId();
  useFloatingLayer(`timePicker:${layerId}`, isMenuOpen);

  const { value: selectValue, options: selectOptions } =
    resolveTimePickerSelection(value, options);
  const parseContext: ParseUserTimeOptions = {
    currentValue: value?.value,
    complementaryValue: complementaryTime,
    role: pickerRole,
  };
  const parseInput = (input: string) => parseUserTime(input, parseContext);

  const cancelScrollToSelected = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  /** Menu options mount after open; wait for paint instead of a magic delay. */
  const scheduleScrollToSelected = () => {
    cancelScrollToSelected();
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const defaultOpt = menuListbox(
          containerRef.current,
        )?.getElementsByClassName(`${TIMEPICKER}__option--is-selected`)[0];
        defaultOpt?.scrollIntoView({ block: "center" });
      });
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const focusedMenuOption = () =>
    optionFromFocusedMenu(containerRef.current, selectOptions, parseContext);

  const commitFocusedOption = () => {
    if (!userAdjustedRef.current) return;
    const option =
      focusedMenuOption() ??
      (() => {
        const input = containerRef.current?.querySelector("input");
        const draft = input?.value?.trim();
        return draft ? parseInput(draft) : undefined;
      })();
    if (option) _onChange(option);
  };

  const commitFocusedOptionRef = useRef(commitFocusedOption);
  commitFocusedOptionRef.current = commitFocusedOption;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onCommitDraft = () => {
      flushSync(() => {
        commitFocusedOptionRef.current();
      });
      setIsMenuOpen(false);
    };

    root.addEventListener(TIME_PICKER_COMMIT_DRAFT_EVENT, onCommitDraft);
    return () => {
      root.removeEventListener(TIME_PICKER_COMMIT_DRAFT_EVENT, onCommitDraft);
    };
  }, [setIsMenuOpen]);

  const { jumpId, resolvedInputId } = resolveFormControlJumpIds(id, inputId);

  return (
    <div ref={containerRef} className="c-time-picker" id={jumpId}>
      <CreatableSelect
        {...props}
        inputId={resolvedInputId}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        styles={timePickerTextStyles}
        value={selectValue}
        maxMenuHeight={4 * 41}
        blurInputOnSelect
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuIsOpen={isMenuOpen}
        //@ts-expect-error uses custom onChange to manage focus in parent
        onChange={(option: SelectOption<string> | null) => {
          if (!option) return;
          // Enter-only: react-select can report the draft time after a
          // filter. Pointer clicks must keep the clicked option.
          if (remapEnterRef.current) {
            remapEnterRef.current = false;
            _onChange(focusedMenuOption() ?? option);
            return;
          }
          _onChange(option);
        }}
        onKeyDown={(e) => {
          const key = e.key;
          if (MENU_NAV_KEYS.has(key)) {
            userAdjustedRef.current = true;
          }

          if (
            (key === "Enter" && !e.metaKey && !e.ctrlKey) ||
            key === "Backspace"
          ) {
            e.stopPropagation();
          }

          if (key === "Enter" && !e.nativeEvent.isComposing) {
            // Bare Enter must not adopt the first list row (often 12 AM).
            // After typing or arrowing, let react-select select so it
            // clears the filter; onChange remaps to the announced row.
            if (!userAdjustedRef.current) {
              e.preventDefault();
              setIsMenuOpen(false);
            } else {
              remapEnterRef.current = true;
            }
          }

          if (key === "Shift") {
            e.stopPropagation();
          }

          if (key === "Escape" && isMenuOpen) {
            userAdjustedRef.current = false;
            setIsMenuOpen(false);
            e.stopPropagation();
          }

          if (key === "Tab") {
            // Commit only after the user changed the draft (arrows or
            // typing). Bare Tab through must leave the current time
            // alone so keyboard users can move past the pickers.
            // react-select's tabSelectsValue preventDefaults Tab and,
            // with blurInputOnSelect, leaves focus on the document
            // instead of the next field.
            if (e.nativeEvent.isComposing) return;
            if (!e.shiftKey) commitFocusedOption();
            setIsMenuOpen(false);
          }
        }}
        onInputChange={(_inputValue, { action }) => {
          if (action === "input-change") {
            userAdjustedRef.current = true;
          }
        }}
        onMenuOpen={() => {
          userAdjustedRef.current = false;
          setIsMenuOpen(true);
          scheduleScrollToSelected();
        }}
        onMenuClose={() => {
          remapEnterRef.current = false;
          cancelScrollToSelected();
          setIsMenuOpen(false);
        }}
        openMenuOnFocus={true}
        options={selectOptions}
        filterOption={(option, inputValue) =>
          filterTimeOption(option, inputValue, parseContext)
        }
        tabSelectsValue={false}
        ariaLiveMessages={{
          guidance: ({
            context,
            isSearchable,
            isMulti,
            isInitialFocus,
            "aria-label": ariaLabel,
          }) => {
            switch (context) {
              case "menu":
                return "Use Up and Down to choose options, press Enter to select the currently focused option, press Escape to exit the menu, press Tab to confirm a newly chosen option and exit, or to leave the current time unchanged.";
              case "input":
                return isInitialFocus
                  ? `${ariaLabel || "Select"} is focused ${isSearchable ? ",type to refine list" : ""}, press Down to open the menu, ${isMulti ? " press left to focus selected values" : ""}`
                  : "";
              case "value":
                return "Use left and right to toggle between focused values, press Backspace to remove the currently focused value";
              default:
                return "";
            }
          },
        }}
        isValidNewOption={(inputValue) => {
          const parsed = parseInput(inputValue);
          if (!parsed) return false;
          // Don't show create row if the parsed time is already in options
          if (
            selectOptions?.some((o) => (o as TimeOption).value === parsed.value)
          ) {
            return false;
          }
          return true;
        }}
        getNewOptionData={(inputValue) => {
          return parseInput(inputValue) as TimeOption;
        }}
        formatCreateLabel={(inputValue) => {
          return parseInput(inputValue)?.label ?? inputValue;
        }}
        createOptionPosition="first"
      />
    </div>
  );
};
