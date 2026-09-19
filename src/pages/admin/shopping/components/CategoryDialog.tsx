import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnitSelect } from "@/components/UnitSelect";
import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { handleTitleCaseChange } from "@/lib/text";
import { PhotoPicker } from "./PhotoPicker";
import { BulkItemInput } from "../types";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  categoryItems: BulkItemInput[];
  setCategoryItems: React.Dispatch<React.SetStateAction<BulkItemInput[]>>;
  units: string[];
  refreshData: () => void;
  onSave: () => void;
}

export type ShoppingCategoryDialogProps = CategoryDialogProps;

export function CategoryDialog({
  open,
  onOpenChange,
  newCategoryName,
  setNewCategoryName,
  categoryItems,
  setCategoryItems,
  units,
  refreshData,
  onSave,
}: CategoryDialogProps) {
  const addCategoryItemRow = () => {
    setCategoryItems((prev) => [
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

  const removeCategoryItemRow = (id: string) => {
    if (categoryItems.length <= 1) return;
    setCategoryItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCategoryItem = (
    id: string,
    field: keyof BulkItemInput,
    value: string,
  ) => {
    setCategoryItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FolderPlus className="w-5 h-5 text-primary" />
            Tambah Kategori
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nama Kategori *</Label>
            <Input
              placeholder="Contoh: Sembako, Minuman, Snack"
              value={newCategoryName}
              onChange={(e) => handleTitleCaseChange(e, setNewCategoryName)}
              maxLength={50}
              className="h-10 text-sm"
            />
          </div>

          <div className="pt-3 border-t border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Daftar Produk *
                </h4>
                <p className="text-xs text-muted-foreground">
                  Minimal 1 produk untuk inisiasi kategori ini
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={addCategoryItemRow}
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris
              </Button>
            </div>

            {categoryItems.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-border/40 bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Produk #{index + 1}
                  </span>
                  {categoryItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeCategoryItemRow(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nama Produk *</Label>
                    <Input
                      placeholder="Contoh: Beras Rojo Lele"
                      value={item.productName}
                      onChange={(e) =>
                        handleTitleCaseChange(e, (value) =>
                          updateCategoryItem(item.id, "productName", value),
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
                          updateCategoryItem(item.id, "brand", value),
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
                        updateCategoryItem(item.id, "quantity", e.target.value)
                      }
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Satuan</Label>
                    <UnitSelect
                      value={item.unit}
                      units={units}
                      onValueChange={(v) =>
                        updateCategoryItem(item.id, "unit", v)
                      }
                      onUnitsChanged={refreshData}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Foto (Opsional)</Label>
                  <PhotoPicker
                    photo={item.photo}
                    onPhotoChange={(photo) =>
                      updateCategoryItem(item.id, "photo", photo || "")
                    }
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
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
            Simpan Kategori & Produk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { CategoryDialog as ShoppingCategoryDialog };

