import { useState, useEffect } from "react";
import { CartItem } from "@/types/pos";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payment: number) => void;
  total: number;
  items: CartItem[];
}

const quickAmounts = [5000, 10000, 20000, 50000, 100000];

export function CheckoutDialog({
  open,
  onClose,
  onConfirm,
  total,
  items,
}: CheckoutDialogProps) {
  const [paymentStr, setPaymentStr] = useState<string>("");
  const payment = parseInt(paymentStr) || 0;
  const change = payment - total;

  useEffect(() => {
    if (open) {
      setPaymentStr(total > 0 ? String(total) : "");
    }
  }, [open, total]);

  const handleConfirm = () => {
    if (payment >= total) {
      onConfirm(payment);
      setPaymentStr("");
    }
  };

  const handleQuickAmount = (amount: number) => {
    setPaymentStr((prev) => String((parseInt(prev) || 0) + amount));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between pb-3 border-b border-border">
            <div>
              <span className="text-xs text-muted-foreground">Total Belanja</span>
              <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {items.reduce((sum, item) => sum + item.quantity, 0)} item
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment" className="text-xs text-muted-foreground">
              Jumlah Bayar
            </Label>
            <PriceInput
              id="payment"
              value={paymentStr}
              onChange={setPaymentStr}
              placeholder="Masukkan jumlah pembayaran"
              className="text-xl h-12 font-semibold"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleQuickAmount(amount)}
              >
                +{formatCurrency(amount)}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPaymentStr(String(total))}
            >
              Uang Pas
            </Button>
          </div>

          <div className="pt-3 border-t border-border flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Kembalian</span>
            <div className="text-right">
              <span
                className={`text-2xl font-bold ${change >= 0 ? "text-primary" : "text-destructive"}`}
              >
                {formatCurrency(Math.max(0, change))}
              </span>
              {change < 0 && (
                <p className="text-xs text-destructive mt-0.5">
                  Kurang {formatCurrency(Math.abs(change))}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={change < 0}
            >
              Konfirmasi Pembayaran
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

