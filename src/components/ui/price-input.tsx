import * as React from "react";
import { cn } from "@/lib/utils";

interface PriceInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "type"
> {
  value: string | number;
  onChange: (value: string) => void;
}

export function formatWithThousandSeparator(value: string | number): string {
  const numStr = String(value).replace(/\D/g, "");
  if (!numStr) return "";
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseThousandSeparator(value: string): string {
  return value.replace(/\./g, "");
}

const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  ({ className, value, onChange, placeholder = "0", ...props }, ref) => {
    const displayValue = formatWithThousandSeparator(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = rawValue.replace(/\D/g, "");
      onChange(numericValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key)) return;
      if (e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;
      if (["Home", "End", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if (e.key < "0" || e.key > "9") {
        e.preventDefault();
      }
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        {...props}
      />
    );
  },
);
PriceInput.displayName = "PriceInput";

export { PriceInput };

