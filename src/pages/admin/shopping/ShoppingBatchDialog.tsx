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
import { PhotoPicker } from "@/components/PhotoPicker";
import { Plus, Trash2, FolderPlus } from "lucide-react";
import { handleTitleCaseChange } from "@/lib/text";
import { BulkItemInput, ShoppingCategory } from "@/types/shopping-list";

export interface ShoppingBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "category" | "bulk_add";
  categoryName?: string;
  setCategoryName?: (name: string) => void;
  categoryId?: string;
  setCategoryId?: (id: string) => void;
  categories?: ShoppingCategory[];
  items: BulkItemInput[];
  setItems: React.Dispatch<React.SetStateAction<BulkItemInput[]>>;
  units: string[];
  refreshData?: () => void;
  onSave: () => void;
}

export function ShoppingBatchDialog({
  open,
  onOpenChange,
  mode,
  categoryName = "",
  setCategoryName,
  categoryId = "",
  setCategoryId,
  categories = [],
  items,
  setItems,
  units,
  refreshData,
  onSave,
}: ShoppingBatchDialogProps) {
  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "1",
        unit: "Pcs",
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItemRow = (id: string, field: keyof BulkItemInput, value: string | null) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (field === "photo") {
          return { ...i, photo: value || undefined };
        }
        return { ...i, [field]: value };
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {mode === "category" ? (
              <>
                <FolderPlus className="w-5 h-5 text-primary" />
                Tambah Kategori Baru
              </>
            ) : (
              "Tambah Banyak Item"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {mode === "category" ? (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nama Kategori *</Label>
              <Input
                placeholder="Contoh: Bumbu Dapur, Sembako, Minuman..."
                value={categoryName}
                onChange={(e) => setCategoryName?.(handleTitleCaseChange(e.target.value))}
                className="h-10 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Kategori *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {mode === "category" ? "Daftar Item (Opsional)" : "Daftar Item"}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Lagi
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((row, index) => (
                <div
                  key={row.id}
                  className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Item #{index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeItemRow(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nama Produk *</Label>
                      <Input
                        placeholder="Contoh: Beras Ramos..."
                        value={row.productName}
                        onChange={(e) =>
                          updateItemRow(row.id, "productName", handleTitleCaseChange(e.target.value))
                        }
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Merk / Brand (Opsional)</Label>
                      <Input
                        placeholder="Contoh: Sania, Gulaku..."
                        value={row.brand}
                        onChange={(e) =>
                          updateItemRow(row.id, "brand", handleTitleCaseChange(e.target.value))
                        }
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Jumlah *</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateItemRow(row.id, "quantity", e.target.value)}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Satuan *</Label>
                      <UnitSelect
                        value={row.unit}
                        units={units}
                        onValueChange={(val) => updateItemRow(row.id, "unit", val)}
                        onUnitsChanged={refreshData}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Label className="text-xs text-muted-foreground block mb-1.5">Foto (Opsional)</Label>
                    <PhotoPicker
                      photo={row.photo}
                      onPhotoChange={(photo) => updateItemRow(row.id, "photo", photo)}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={onSave}
              className="flex-1 h-10 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {mode === "category" ? "Simpan Kategori" : "Simpan Semua Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  categoryItems: BulkItemInput[];
  setCategoryItems: React.Dispatch<React.SetStateAction<BulkItemInput[]>>;
  units: string[];
  refreshData?: () => void;
  onSave: () => void;
}) {
  return (
    <ShoppingBatchDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="category"
      categoryName={newCategoryName}
      setCategoryName={setNewCategoryName}
      items={categoryItems}
      setItems={setCategoryItems}
      units={units}
      refreshData={refreshData}
      onSave={onSave}
    />
  );
}

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkCategoryId: string;
  setBulkCategoryId: (id: string) => void;
  bulkItems: BulkItemInput[];
  setBulkItems: React.Dispatch<React.SetStateAction<BulkItemInput[]>>;
  categories: ShoppingCategory[];
  units: string[];
  refreshData?: () => void;
  onSave: () => void;
}) {
  return (
    <ShoppingBatchDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="bulk_add"
      categoryId={bulkCategoryId}
      setCategoryId={setBulkCategoryId}
      categories={categories}
      items={bulkItems}
      setItems={setBulkItems}
      units={units}
      refreshData={refreshData}
      onSave={onSave}
    />
  );
}
