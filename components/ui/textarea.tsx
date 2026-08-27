import { forwardRef, useId } from "react";

import { fieldControlClassName, FormFieldWrapper } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, helperText, required, className, rows = 4, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldControlClassName,
            "h-auto resize-y py-2",
            error && "border-error",
            className,
          )}
          {...props}
        />
      </FormFieldWrapper>
    );
  },
);
Textarea.displayName = "Textarea";
