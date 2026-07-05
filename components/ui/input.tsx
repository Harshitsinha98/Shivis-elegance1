"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-border bg-pearl px-4 py-3 text-sm text-obsidian placeholder:text-warm-gray/70 transition focus:border-champagne focus:outline-none focus:ring-2 focus:ring-champagne/30 disabled:opacity-50";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs uppercase tracking-[0.12em] text-warm-gray"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(fieldBase, error && "border-red-400 focus:ring-red-200", className)}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs uppercase tracking-[0.12em] text-warm-gray"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        ref={ref}
        className={cn(fieldBase, "min-h-28 resize-y", error && "border-red-400", className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(({ className, label, id, children, ...props }, ref) => {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs uppercase tracking-[0.12em] text-warm-gray"
        >
          {label}
        </label>
      )}
      <select id={inputId} ref={ref} className={cn(fieldBase, "cursor-pointer", className)} {...props}>
        {children}
      </select>
    </div>
  );
});
Select.displayName = "Select";
