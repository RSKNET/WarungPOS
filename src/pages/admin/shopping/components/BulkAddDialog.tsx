import React from "react";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnitSelect } from "@/components/UnitSelect";
import { Plus, Trash2 } from "lucide-react";
import { handleTitleCaseChange } from "@/lib/text";
import { PhotoPicker } from "./PhotoPicker";
import { BulkItemInput } from "../types";
import { ShoppingCategory } from "@/types/shopping-list";

interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkCategoryId: string;
  setBulkCategoryId: (id: string) => void;
  bulkItems: BulkItemInput[];
  setBulkItems: React.Dispatch<React.SetStateAction<BulkItemInput[]>>;
  categories: ShoppingCategory[];
  units: string[];
  refreshData: () => void;
  onSave: () => void;
}

export type ShoppingBulkAddDialogProps = BulkAddDialogProps;

export function BulkAddDialog({
  open,
  onOpenChange,
  bulkCategoryId,
  setBulkCategoryId,
  bulkItems,
  setBulkItems,
  categories,
  units,
  refreshData,
  onSave,
}: BulkAddDialogProps) {
  const addBulkItemRow = () => {
    setBulkItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
        photo: "",
      },
    ]);
  };

  const removeBulkItemRow = (id: string) => {
    if (bulkItems.length <= 1) return;
    setBulkItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateBulkItem = (
    id: string,
    field: keyof BulkItemInput,
    value: string,
  ) => {
    setBulkItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="w-5 h-5 text-primary" />
            Tambah Produk Belanja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5 pb-2 border-b border-border/40">
            <Label className="text-sm font-medium">Kategori Belanja *</Label>
            <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bulkItems.map((item, index) => (
            <div
              key={item.id}
              className="py-3 border-b border-border/30 last:border-b-0 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Baris {index + 1}
                </span>
                {bulkItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeBulkItemRow(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nama Produk *</Label>
                  <Input
                    placeholder="Nama produk"
                    value={item.productName}
                    onChange={(e) =>
                      handleTitleCaseChange(e, (value) =>
                        updateBulkItem(item.id, "productName", value),
                      )
                    }
                    maxLength={100}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Merk</Label>
                  <Input
                    placeholder="Merk (opsional)"
                    value={item.brand}
                    onChange={(e) =>
                      handleTitleCaseChange(e, (value) =>
                        updateBulkItem(item.id, "brand", value),
                      )
                    }
                    maxLength={50}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Jumlah</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateBulkItem(item.id, "quantity", e.target.value)
                    }
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Satuan</Label>
                  <UnitSelect
                    value={item.unit}
                    units={units}
                    onValueChange={(v) => updateBulkItem(item.id, "unit", v)}
                    onUnitsChanged={refreshData}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Foto (Opsional)</Label>
                <PhotoPicker
                  photo={item.photo}
                  onPhotoChange={(photo) =>
                    updateBulkItem(item.id, "photo", photo || "")
                  }
                  size="sm"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addBulkItemRow}
            className="w-full h-10 text-sm font-medium gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Baris Item
          </Button>
        </div>
        <div className="flex gap-3 pt-3 border-t border-border/40">
          <Button
            variant="outline"
            className="flex-1 h-10 text-sm font-medium"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            className="flex-1 h-10 text-sm font-medium"
            onClick={onSave}
          >
            Simpan {bulkItems.filter((i) => i.productName.trim()).length} Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { BulkAddDialog as ShoppingBulkAddDialog };

