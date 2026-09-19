import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SuggestOption {
  id?: string;
  label: string;
  badge?: string;
  data?: unknown;
}

export interface SuggestInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "onSelect"
  > {
  value: string;
  options: SuggestOption[];
  onChange: (value: string) => void;
  onSelectOption?: (option: SuggestOption) => void;
  placeholder?: string;
  className?: string;
}

export function SuggestInput({
  value,
  options,
  onChange,
  onSelectOption,
  placeholder,
  className,
  ...props
}: SuggestInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeoutRef = useRef<number | null>(null);

  const filtered = !value.trim()
    ? []
    : options.filter((opt) =>
        opt.label.toLowerCase().includes(value.trim().toLowerCase()),
      );

  const handleSelect = (opt: SuggestOption) => {
    onChange(opt.label);
    onSelectOption?.(opt);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    props.onBlur?.(e);
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 200);
  };

  return (
    <div className="relative w-full">
      <Input
        {...props}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto p-1">
          {filtered.map((opt, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.id || `${opt.label}-${idx}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                  handleSelect(opt);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-2 text-xs rounded flex items-center justify-between gap-2 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50 text-foreground",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.badge && (
                  <span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

