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
import { MarkupRule, MarkupType } from "@/types/markup";
import { Category } from "@/types/category";
import { formatCurrency } from "@/lib/format";

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: MarkupRule | null;
  categories: Category[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  noMaxLimit: boolean;
  setNoMaxLimit: (v: boolean) => void;
  markupType: MarkupType;
  setMarkupType: (type: MarkupType) => void;
  retailMarkup: string;
  setRetailMarkup: (v: string) => void;
  wholesaleMarkup: string;
  setWholesaleMarkup: (v: string) => void;
  retailMarkupFixed: string;
  setRetailMarkupFixed: (v: string) => void;
  wholesaleMarkupFixed: string;
  setWholesaleMarkupFixed: (v: string) => void;
  preview: { retail: number; wholesale: number } | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export type PricingRuleDialogProps = RuleDialogProps;

export function RuleDialog({
  open,
  onOpenChange,
  editingRule,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  noMaxLimit,
  setNoMaxLimit,
  markupType,
  setMarkupType,
  retailMarkup,
  setRetailMarkup,
  wholesaleMarkup,
  setWholesaleMarkup,
  retailMarkupFixed,
  setRetailMarkupFixed,
  wholesaleMarkupFixed,
  setWholesaleMarkupFixed,
  preview,
  onSubmit,
  onClose,
}: RuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold">
            {editingRule ? "Edit Aturan Markup" : "Tambah Aturan Markup"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Tentukan rentang harga modal dan markup (persen atau rupiah)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Berlaku Untuk
              </Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Produk</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPrice" className="text-sm font-medium">
                  Harga Minimum
                </Label>
                <PriceInput
                  id="minPrice"
                  value={minPrice}
                  onChange={setMinPrice}
                  placeholder="0"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice" className="text-sm font-medium">
                  Harga Maksimum
                </Label>
                <PriceInput
                  id="maxPrice"
                  value={maxPrice}
                  onChange={setMaxPrice}
                  placeholder="Tidak terbatas"
                  disabled={noMaxLimit}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="noMaxLimit"
                checked={noMaxLimit}
                onChange={(e) => {
                  setNoMaxLimit(e.target.checked);
                  if (e.target.checked) setMaxPrice("");
                }}
                className="rounded border-input h-4 w-4"
              />
              <Label
                htmlFor="noMaxLimit"
                className="text-sm font-normal cursor-pointer"
              >
                Tidak ada batas maksimum (ke atas)
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipe Markup</Label>
              <Select
                value={markupType}
                onValueChange={(v) => setMarkupType(v as MarkupType)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Rupiah Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {markupType === "percent" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailMarkup" className="text-sm font-medium">
                    Markup Satuan (%)
                  </Label>
                  <Input
                    id="retailMarkup"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="100"
                    value={retailMarkup}
                    onChange={(e) => setRetailMarkup(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="wholesaleMarkup"
                    className="text-sm font-medium"
                  >
                    Markup Grosir (%)
                  </Label>
                  <Input
                    id="wholesaleMarkup"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="50"
                    value={wholesaleMarkup}
                    onChange={(e) => setWholesaleMarkup(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="retailMarkupFixed"
                    className="text-sm font-medium"
                  >
                    Markup Satuan (Rp)
                  </Label>
                  <PriceInput
                    id="retailMarkupFixed"
                    value={retailMarkupFixed}
                    onChange={setRetailMarkupFixed}
                    placeholder="5.000"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="wholesaleMarkupFixed"
                    className="text-sm font-medium"
                  >
                    Markup Grosir (Rp)
                  </Label>
                  <PriceInput
                    id="wholesaleMarkupFixed"
                    value={wholesaleMarkupFixed}
                    onChange={setWholesaleMarkupFixed}
                    placeholder="3.000"
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            )}

            {preview && (
              <div className="py-2.5 px-3 border-l-2 border-primary bg-muted/30 text-sm">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">
                  Contoh Kalkulasi
                </p>
                <p className="text-muted-foreground text-sm">
                  Harga modal{" "}
                  <strong className="text-foreground">
                    {formatCurrency(parseInt(minPrice) || 0)}
                  </strong>{" "}
                  → Satuan{" "}
                  <strong className="text-primary">
                    {formatCurrency(preview.retail)}
                  </strong>{" "}
                  | Grosir{" "}
                  <strong className="text-foreground">
                    {formatCurrency(preview.wholesale)}
                  </strong>
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1 h-10 text-sm font-medium">
              {editingRule ? "Simpan Perubahan" : "Tambah Aturan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { RuleDialog as PricingRuleDialog };

