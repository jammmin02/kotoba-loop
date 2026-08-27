import type { ReactNode } from "react";

export interface FormFieldWrapperProps {
  label?: string;
  htmlFor: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormFieldWrapper({
  label,
  htmlFor,
  error,
  helperText,
  required,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="text-error" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${htmlFor}-helper`} className="text-xs text-foreground/60">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export const fieldControlClassName =
  "h-10 rounded-none border-2 border-pixel-ink bg-background px-3 text-sm text-foreground shadow-bevel-sunken transition placeholder:text-foreground/40 focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
