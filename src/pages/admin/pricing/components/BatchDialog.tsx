import React from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Layers } from "lucide-react";
import { TierInput } from "../types";
import { TierRow } from "./TierRow";
import { MarkupType } from "@/types/markup";
import { Category } from "@/types/category";

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  batchCategoryId: string;
  setBatchCategoryId: (id: string) => void;
  batchMarkupType: MarkupType;
  setBatchMarkupType: (type: MarkupType) => void;
  tiers: TierInput[];
  addTier: () => void;
  updateTier: (id: string, field: keyof TierInput, value: any) => void;
  removeTier: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export type PricingBatchDialogProps = BatchDialogProps;

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
            Generate Aturan Bertingkat
          </DialogTitle>
          <DialogDescription className="text-sm">
            Buat beberapa aturan rentang harga modal sekaligus dalam satu
            kategori
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kategori</Label>
              <Select
                value={batchCategoryId}
                onValueChange={setBatchCategoryId}
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

            <div className="flex items-center justify-between pb-1">
              <Label className="text-sm font-medium">Tipe Nilai Markup</Label>
              <Select
                value={batchMarkupType}
                onValueChange={(v) => setBatchMarkupType(v as MarkupType)}
              >
                <SelectTrigger className="w-48 h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Rupiah Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tingkatan Harga Modal & Markup
              </Label>
              <div className="divide-y divide-border/30 border-y border-border/40">
                {tiers.map((tier, index) => (
                  <TierRow
                    key={tier.id}
                    tier={tier}
                    index={index}
                    batchMarkupType={batchMarkupType}
                    updateTier={updateTier}
                    removeTier={removeTier}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addTier}
                className="w-full gap-2 h-10 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Tambah Tingkatan
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1 h-10 text-sm font-medium">
              Simpan {tiers.length} Aturan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { BatchDialog as PricingBatchDialog };

