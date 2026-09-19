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
import { handleTitleCaseChange } from "@/lib/text";
import { PhotoPicker } from "./PhotoPicker";

interface ShoppingEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    productName: string;
    brand: string;
    quantity: string;
    unit: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      productName: string;
      brand: string;
      quantity: string;
      unit: string;
    }>
  >;
  formPhoto: string | null;
  setFormPhoto: (photo: string | null) => void;
  units: string[];
  refreshData: () => void;
  onSave: () => void;
}

export function EditItemDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  formPhoto,
  setFormPhoto,
  units,
  refreshData,
  onSave,
}: ShoppingEditItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Edit Item Belanja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nama Produk *</Label>
            <Input
              placeholder="Contoh: Beras, Gula, Minyak"
              value={formData.productName}
              onChange={(e) =>
                handleTitleCaseChange(e, (value) =>
                  setFormData({ ...formData, productName: value }),
                )
              }
              maxLength={100}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Merk</Label>
            <Input
              placeholder="Contoh: Rose Brand, Gulaku"
              value={formData.brand}
              onChange={(e) =>
                handleTitleCaseChange(e, (value) =>
                  setFormData({ ...formData, brand: value }),
                )
              }
              maxLength={50}
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Jumlah</Label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: e.target.value,
                  })
                }
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Satuan *</Label>
              <UnitSelect
                value={formData.unit}
                units={units}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
                onUnitsChanged={refreshData}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium block">
              Foto Produk (Opsional)
            </Label>
            <PhotoPicker
              photo={formPhoto}
              onPhotoChange={setFormPhoto}
              size="md"
            />
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
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { EditItemDialog as ShoppingEditItemDialog };

