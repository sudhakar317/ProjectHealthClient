import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectMenuProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Flat options, or options gathered under headings. */
  options: SelectOption[] | SelectGroup[];
  /** Shown when `value` matches no option; also rendered as the "any" choice. */
  placeholder: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** False removes the placeholder from the list, so the field cannot be cleared once set. */
  allowEmpty?: boolean;
  className?: string;
}

const isGrouped = (options: SelectOption[] | SelectGroup[]): options is SelectGroup[] =>
  options.length > 0 && "options" in options[0];

/**
 * Replaces the native <select>, which renders with the operating system's own styling and sits
 * awkwardly against the rest of the UI. Built on the dropdown menu already in use elsewhere.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  disabled,
  invalid,
  allowEmpty = true,
  className,
  ...props
}: SelectMenuProps) {
  const groups: SelectGroup[] = isGrouped(options) ? options : [{ label: "", options }];
  const flat = groups.flatMap((g) => g.options);
  const selected = flat.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={props["aria-label"]}
          aria-invalid={invalid}
          className={cn(
            fieldClass,
            "items-center justify-between gap-2 text-left data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/25",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[18rem] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[10rem] overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {allowEmpty && <DropdownMenuRadioItem value="">{placeholder}</DropdownMenuRadioItem>}
          {groups.map((group, index) => (
            <div key={group.label || index}>
              {group.label && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                </>
              )}
              {group.options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <span className="truncate">{option.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
