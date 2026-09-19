import { Product, ProductVariant } from "@/types/pos";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  variant: ProductVariant;
  onClick: () => void;
}

export function ProductCard({ product, variant, onClick }: ProductCardProps) {
  const lowStock = variant.stock <= 5;
  const outOfStock = variant.stock === 0;

  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      className={cn(
        "w-full text-left rounded-lg border border-border/80 bg-card p-2.5 sm:p-3 transition-colors flex flex-col justify-between min-h-[85px] sm:min-h-[92px] hover:border-primary/60 hover:bg-accent/30 active:scale-[0.99]",
        outOfStock &&
          "opacity-50 cursor-not-allowed hover:border-border/80 hover:bg-card active:scale-100",
      )}
    >
      <div className="w-full min-w-0">
        <h3 className="font-medium text-xs sm:text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
          {variant.name} {variant.sku ? `· ${variant.sku}` : ""}
        </p>
      </div>

      <div className="w-full flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-border/50">
        <p className="font-bold text-xs sm:text-sm text-primary truncate">
          {formatCurrency(variant.retailPrice)}
        </p>
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0",
            outOfStock
              ? "bg-destructive/10 text-destructive"
              : lowStock
                ? "bg-warning/10 text-warning"
                : "bg-muted/70 text-muted-foreground",
          )}
        >
          {(lowStock || outOfStock) && <AlertCircle className="w-3 h-3" />}
          <span>{variant.stock} {variant.name}</span>
        </div>
      </div>
    </button>
  );
}

