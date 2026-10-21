import { ReactNode } from "react";
import { Search, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ActionBarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "secondary" | "destructive" | "ghost";
  destructive?: boolean;
}

export interface ResponsiveActionBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearchDisabled?: boolean;
  selectedCount?: number;
  actions?: ActionBarItem[];
  rightElement?: ReactNode;
  className?: string;
}

export function ResponsiveActionBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Cari...",
  isSearchDisabled = false,
  selectedCount = 0,
  actions = [],
  rightElement,
  className,
}: ResponsiveActionBarProps) {
  const hasActions = actions.length > 0;

  return (
    <div className={cn("flex items-center justify-between gap-2.5", className)}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 text-sm"
          disabled={isSearchDisabled}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasActions && (
          <>
            <div className="hidden sm:flex items-center gap-1.5">
              {actions.map((act) => {
                const Icon = act.icon;
                const isDisabled = act.disabled ?? selectedCount === 0;
                return (
                  <Button
                    key={act.id}
                    variant={act.variant || "outline"}
                    size="sm"
                    className={cn(
                      "h-9 px-3 text-xs gap-1.5",
                      act.destructive && "text-destructive hover:text-destructive"
                    )}
                    disabled={isDisabled}
                    onClick={act.onClick}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{act.label}</span>
                    {selectedCount > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                        {selectedCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 relative"
                  >
                    <MoreVertical className="w-4 h-4" />
                    {selectedCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {selectedCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {actions.map((act) => {
                    const Icon = act.icon;
                    const isDisabled = act.disabled ?? selectedCount === 0;
                    return (
                      <DropdownMenuItem
                        key={act.id}
                        disabled={isDisabled}
                        onClick={act.onClick}
                        className={cn(
                          "gap-2 text-xs py-2",
                          act.destructive && "text-destructive focus:text-destructive"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{act.label}</span>
                        {selectedCount > 0 && (
                          <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                            ({selectedCount})
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}

        {rightElement}
      </div>
    </div>
  );
}
