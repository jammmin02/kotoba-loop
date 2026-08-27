import { forwardRef, useId } from "react";

import { PixelChevronDown } from "@/components/icons/pixel-icons";
import { fieldControlClassName, FormFieldWrapper } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, error, helperText, required, className, options, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

    return (
      <FormFieldWrapper
        label={label}
        htmlFor={inputId}
        error={error}
        helperText={helperText}
        required={required}
      >
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(
              fieldControlClassName,
              "w-full appearance-none pr-9",
              error && "border-error",
              className,
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <PixelChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground/50"
            aria-hidden="true"
          />
        </div>
      </FormFieldWrapper>
    );
  },
);
Select.displayName = "Select";
