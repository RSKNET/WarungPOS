import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Layers, Trash2 } from "lucide-react";
import { MarkupType, TierInput } from "@/types/markup";
import { Category } from "@/types/category";

interface TierRowProps {
  tier: TierInput;
  index: number;
  batchMarkupType: MarkupType;
  updateTier: (id: string, field: keyof TierInput, value: TierInput[keyof TierInput]) => void;
  removeTier: (id: string) => void;
}

function TierRow({
  tier,
  index,
  batchMarkupType,
  updateTier,
  removeTier,
}: TierRowProps) {
  return (
    <div className="py-3.5 first:pt-2 last:pb-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-1">
          {index + 1}
        </div>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Harga Min</Label>
              <PriceInput
                value={tier.minPrice}
                onChange={(v) => updateTier(tier.id, "minPrice", v)}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Harga Max</Label>
              <PriceInput
                value={tier.maxPrice}
                onChange={(v) => updateTier(tier.id, "maxPrice", v)}
                placeholder="Tidak terbatas"
                disabled={tier.noMaxLimit}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`noLimit-${tier.id}`}
              checked={tier.noMaxLimit}
              onChange={(e) =>
                updateTier(tier.id, "noMaxLimit", e.target.checked)
              }
              className="rounded border-input h-4 w-4"
            />
            <Label
              htmlFor={`noLimit-${tier.id}`}
              className="text-xs sm:text-sm font-normal cursor-pointer"
            >
              Tidak ada batas maksimum (ke atas)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {batchMarkupType === "percent" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Satuan (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="100"
                    value={tier.retailMarkup}
                    onChange={(e) =>
                      updateTier(tier.id, "retailMarkup", e.target.value)
                    }
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Grosir (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="50"
                    value={tier.wholesaleMarkup}
                    onChange={(e) =>
                      updateTier(tier.id, "wholesaleMarkup", e.target.value)
                    }
                    className="h-10 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Satuan (Rp)
                  </Label>
                  <PriceInput
                    value={tier.retailMarkupFixed}
                    onChange={(v) =>
                      updateTier(tier.id, "retailMarkupFixed", v)
                    }
                    placeholder="5.000"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Grosir (Rp)
                  </Label>
                  <PriceInput
                    value={tier.wholesaleMarkupFixed}
                    onChange={(v) =>
                      updateTier(tier.id, "wholesaleMarkupFixed", v)
                    }
                    placeholder="3.000"
                    className="h-10 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeTier(tier.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  batchCategoryId: string;
  setBatchCategoryId: (id: string) => void;
  batchMarkupType: MarkupType;
  setBatchMarkupType: (type: MarkupType) => void;
  tiers: TierInput[];
  addTier: () => void;
  updateTier: (id: string, field: keyof TierInput, value: TierInput[keyof TierInput]) => void;
  removeTier: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function BatchDialog({
  open,
  onOpenChange,
  categories,
  batchCategoryId,
  setBatchCategoryId,
  batchMarkupType,
  setBatchMarkupType,
  tiers,
  addTier,
  updateTier,
  removeTier,
  onSubmit,
}: BatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Layers className="w-5 h-5 text-primary" />
            Atur Aturan Bertingkat Sekaligus
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Buat beberapa tier markup sekaligus berdasarkan rentang harga modal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Kategori</Label>
              <Select
                value={batchCategoryId}
                onValueChange={setBatchCategoryId}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    Semua Kategori (Global)
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipe Markup</Label>
              <Select
                value={batchMarkupType}
                onValueChange={(val: MarkupType) => setBatchMarkupType(val)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <Label className="text-sm font-bold">Daftar Rentang Harga</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTier}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Rentang
              </Button>
            </div>

            <div className="divide-y divide-border/30 max-h-[45vh] overflow-y-auto pr-1">
              {tiers.map((tier, idx) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  index={idx}
                  batchMarkupType={batchMarkupType}
                  updateTier={updateTier}
                  removeTier={removeTier}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-sm font-medium"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Simpan Semua Aturan ({tiers.length})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { BatchDialog as PricingBatchDialog };
export type { BatchDialogProps as PricingBatchDialogProps };
