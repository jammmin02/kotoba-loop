import { forwardRef, useId } from "react";

import { fieldControlClassName, FormFieldWrapper } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, required, className, ...props }, ref) => {
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
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(fieldControlClassName, error && "border-error", className)}
          {...props}
        />
      </FormFieldWrapper>
    );
  },
);
Input.displayName = "Input";
