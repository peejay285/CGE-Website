"use client";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text",
          "placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25",
          "transition-colors",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            "w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 pr-10 text-sm text-text",
            "focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25",
            "transition-colors appearance-none cursor-pointer",
            className
          )}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text",
          "placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25",
          "transition-colors resize-none min-h-[100px]",
          className
        )}
        {...props}
      />
    </div>
  );
}
