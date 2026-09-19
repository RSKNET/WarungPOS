import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Delete,
  Info,
  Plus,
  Minus,
  X,
  Divide,
  Equal,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCalculator } from "@/hooks/use-calculator";
import { useIsMobile } from "@/hooks/use-mobile";

export function CalculatorView() {
  const isMobile = useIsMobile();
  const {
    cost,
    selectedCategory,
    setSelectedCategory,
    categories,
    markupRules,
    markup,
    isFixedMarkup,
    retailPrice,
    wholesalePrice,
    appliedRule,
    expressionDisplay,
    handleNumber,
    handleClear,
    handleBackspace,
    handleTripleZero,
    handleDoubleZero,
    handleOperator,
    handleEquals,
    copyToClipboard,
  } = useCalculator();

  const numpadButtons = [
    { label: "7", action: () => handleNumber("7") },
    { label: "8", action: () => handleNumber("8") },
    { label: "9", action: () => handleNumber("9") },
    {
      label: <Divide className="w-5 h-5" />,
      action: () => handleOperator("÷"),
      variant: "secondary" as const,
    },
    { label: "4", action: () => handleNumber("4") },
    { label: "5", action: () => handleNumber("5") },
    { label: "6", action: () => handleNumber("6") },
    {
      label: <X className="w-5 h-5" />,
      action: () => handleOperator("×"),
      variant: "secondary" as const,
    },
    { label: "1", action: () => handleNumber("1") },
    { label: "2", action: () => handleNumber("2") },
    { label: "3", action: () => handleNumber("3") },
    {
      label: <Minus className="w-5 h-5" />,
      action: () => handleOperator("-"),
      variant: "secondary" as const,
    },
    { label: "0", action: () => handleNumber("0") },
    { label: "00", action: handleDoubleZero, variant: "outline" as const },
    { label: "000", action: handleTripleZero, variant: "outline" as const },
    {
      label: <Plus className="w-5 h-5" />,
      action: () => handleOperator("+"),
      variant: "secondary" as const,
    },
    {
      label: <Delete className="w-5 h-5" />,
      action: handleBackspace,
      variant: "outline" as const,
    },
    {
      label: "C",
      action: handleClear,
      variant: "outline" as const,
    },
    {
      label: <Equal className="w-5 h-5" />,
      action: handleEquals,
      variant: "default" as const,
      span: 2,
    },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-col h-full max-h-[calc(100dvh-3.5rem)]">
        <div className="border-b border-border/40 p-4 space-y-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="py-2.5 px-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harga Modal</span>
              {expressionDisplay && (
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                  {expressionDisplay}
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-right tracking-tight text-foreground truncate">
              {formatCurrency(cost)}
            </div>
          </div>

          {cost > 0 && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-0.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
              {appliedRule ? (
                <span className="truncate">
                  Markup:{" "}
                  <strong className="text-foreground">
                    {appliedRule.markupType === "fixed"
                      ? `+${formatCurrency(appliedRule.retailMarkupFixed || 0)} / +${formatCurrency(appliedRule.wholesaleMarkupFixed || 0)}`
                      : `${appliedRule.retailMarkupPercent}% / ${appliedRule.wholesaleMarkupPercent}%`}
                  </strong>
                  {appliedRule.categoryName && ` (${appliedRule.categoryName})`}
                </span>
              ) : (
                <Link to="/admin/pricing" className="text-destructive underline font-medium">
                  Tidak ada aturan markup
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-border/40 bg-background">
          <button
            type="button"
            onClick={() => markup && copyToClipboard(retailPrice, "Eceran")}
            disabled={!markup || cost <= 0}
            className={cn(
              "text-left transition-all focus:outline-none",
              (!markup || cost <= 0) && "opacity-40 cursor-not-allowed",
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Eceran
              </span>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="text-xl font-extrabold text-primary tracking-tight truncate">
              {formatCurrency(retailPrice)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isFixedMarkup
                ? `+${formatCurrency(markup?.retailFixed || 0)}`
                : `+${markup?.retailPercent || 0}%`}
            </div>
          </button>

          <button
            type="button"
            onClick={() => markup && copyToClipboard(wholesalePrice, "Grosir")}
            disabled={!markup || cost <= 0}
            className={cn(
              "text-left transition-all focus:outline-none",
              (!markup || cost <= 0) && "opacity-40 cursor-not-allowed",
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grosir
              </span>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="text-xl font-extrabold text-foreground tracking-tight truncate">
              {formatCurrency(wholesalePrice)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isFixedMarkup
                ? `+${formatCurrency(markup?.wholesaleFixed || 0)}`
                : `+${markup?.wholesalePercent || 0}%`}
            </div>
          </button>
        </div>

        <div className="flex-1 p-3">
          <div className="grid grid-cols-4 gap-2 h-full">
            {numpadButtons.map((btn, idx) => (
              <Button
                key={idx}
                variant={btn.variant || "outline"}
                onClick={btn.action}
                className={cn(
                  "text-xl font-bold h-full min-h-[3.25rem] active:scale-95 transition-transform",
                  btn.span === 2 && "col-span-2",
                )}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6 pb-4 border-b border-border/40">
            <button
              type="button"
              onClick={() => markup && copyToClipboard(retailPrice, "Eceran")}
              disabled={!markup || cost <= 0}
              className={cn(
                "text-left transition-all group focus:outline-none",
                (!markup || cost <= 0) && "opacity-40 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Harga Eceran
                </span>
                <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight truncate">
                {formatCurrency(retailPrice)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                Profit: <span className="font-semibold text-foreground">{formatCurrency(retailPrice - cost)}</span>
                <span className="ml-1 text-xs">
                  {isFixedMarkup
                    ? `(+${formatCurrency(markup?.retailFixed || 0)})`
                    : `(+${markup?.retailPercent || 0}%)`}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                markup && copyToClipboard(wholesalePrice, "Grosir")
              }
              disabled={!markup || cost <= 0}
              className={cn(
                "text-left transition-all group focus:outline-none",
                (!markup || cost <= 0) && "opacity-40 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Harga Grosir
                </span>
                <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                {formatCurrency(wholesalePrice)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                Profit: <span className="font-semibold text-foreground">{formatCurrency(wholesalePrice - cost)}</span>
                <span className="ml-1 text-xs">
                  {isFixedMarkup
                    ? `(+${formatCurrency(markup?.wholesaleFixed || 0)})`
                    : `(+${markup?.wholesalePercent || 0}%)`}
                </span>
              </div>
            </button>
          </div>

          {cost > 0 && (
            <div className="py-2.5 px-3 border-l-2 border-primary bg-muted/20 text-sm space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="w-4 h-4 text-primary" />
                Aturan yang Diterapkan
              </div>
              {appliedRule ? (
                <div className="text-muted-foreground text-xs sm:text-sm space-y-0.5">
                  <p>
                    Rentang: <strong className="text-foreground">{formatCurrency(appliedRule.minPrice)}</strong> -{" "}
                    <strong className="text-foreground">
                      {appliedRule.maxPrice ? formatCurrency(appliedRule.maxPrice) : "∞"}
                    </strong>
                  </p>
                  <p>
                    {appliedRule.markupType === "fixed"
                      ? `Eceran: +${formatCurrency(appliedRule.retailMarkupFixed || 0)} | Grosir: +${formatCurrency(appliedRule.wholesaleMarkupFixed || 0)}`
                      : `Eceran: ${appliedRule.retailMarkupPercent}% | Grosir: ${appliedRule.wholesaleMarkupPercent}%`}
                  </p>
                  {appliedRule.categoryName && (
                    <p className="text-primary font-medium">
                      Kategori: {appliedRule.categoryName}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-destructive text-sm">
                  Tidak ada aturan yang cocok.{" "}
                  <Link to="/admin/pricing" className="underline font-semibold">
                    Tambah aturan markup
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Daftar Aturan Markup Aktif
              </h4>
              <Link
                to="/admin/pricing"
                className="text-xs sm:text-sm text-primary hover:underline font-medium"
              >
                Kelola Aturan
              </Link>
            </div>
            {markupRules.length > 0 ? (
              <div className="divide-y divide-border/30 max-h-72 overflow-y-auto pr-1">
                {markupRules.map((rule) => {
                  const category = categories.find(
                    (c) => c.id === rule.categoryId,
                  );
                  return (
                    <div
                      key={rule.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(rule.minPrice)} -{" "}
                          {rule.maxPrice ? formatCurrency(rule.maxPrice) : "∞"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {category ? category.name : "Semua Kategori"}
                        </span>
                      </div>
                      <div className="text-right text-sm tabular-nums text-foreground font-medium">
                        {rule.markupType === "fixed" ? (
                          <p>
                            +{formatCurrency(rule.retailMarkupFixed || 0)} / +
                            {formatCurrency(rule.wholesaleMarkupFixed || 0)}
                          </p>
                        ) : (
                          <p>
                            {rule.retailMarkupPercent}% /{" "}
                            {rule.wholesaleMarkupPercent}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <p className="mb-2">Belum ada aturan markup</p>
                <Button asChild variant="outline" className="h-9 px-3 text-sm font-medium">
                  <Link to="/admin/pricing">Buat Aturan Markup</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pilih Kategori</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="py-3 px-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Input Harga Modal</span>
              {expressionDisplay && (
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
                  {expressionDisplay}
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-right tracking-tight text-foreground truncate">
              {formatCurrency(cost)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {numpadButtons.map((btn, idx) => (
              <Button
                key={idx}
                variant={btn.variant || "outline"}
                onClick={btn.action}
                className={cn(
                  "text-xl font-bold h-14 transition-transform active:scale-95",
                  btn.span === 2 && "col-span-2",
                )}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Backward-compatible aliases
export const DesktopCalculator = CalculatorView;
export const MobileCalculator = CalculatorView;
