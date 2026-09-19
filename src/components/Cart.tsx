import { CartItem } from "@/types/pos";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from "lucide-react";

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onCheckout: () => void;
  onDebt?: () => void;
  total: number;
}

export function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onDebt,
  total,
}: CartProps) {
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Keranjang Kosong</p>
        <p className="text-sm">Pilih produk untuk memulai transaksi</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-border/60">
        {items.map((item) => (
          <div
            key={item.variant.id}
            className="p-3 sm:px-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {item.product.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.variant.name} ·{" "}
                  {formatCurrency(
                    item.priceType === "wholesale"
                      ? item.variant.wholesalePrice
                      : item.variant.retailPrice,
                  )}
                  {item.priceType === "wholesale" && (
                    <span className="ml-1 text-primary font-medium">(Grosir)</span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => onRemoveItem(item.variant.id)}
                title="Hapus"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    onUpdateQuantity(item.variant.id, item.quantity - 1)
                  }
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(
                      item.variant.id,
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-14 h-7 text-center text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    onUpdateQuantity(item.variant.id, item.quantity + 1)
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="font-bold text-sm text-foreground">
                {formatCurrency(item.subtotal)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 sm:p-4 space-y-3 bg-card shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Total ({items.length} item)
          </span>
          <span className="text-xl sm:text-2xl font-bold text-primary">
            {formatCurrency(total)}
          </span>
        </div>
        <div className="flex gap-2">
          {onDebt && (
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-semibold border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onDebt}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              Hutang
            </Button>
          )}
          <Button
            className="flex-1 h-11 text-sm font-semibold"
            onClick={onCheckout}
          >
            Bayar
          </Button>
        </div>
      </div>
    </div>
  );
}

