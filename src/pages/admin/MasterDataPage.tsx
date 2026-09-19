import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tags, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleTitleCaseChange } from "@/lib/text";

import { useUnitStore } from "@/stores";
import { isUnitInUse } from "@/database/units";
import { Unit } from "@/types/unit";
import { sortAlpha } from "@/lib/sorting";
import { CategoryListManager } from "@/components/CategoryManager";

export function MasterDataPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");

  const {
    units: storeUnits,
    addUnit: storeAddUnit,
    updateUnit: storeUpdateUnit,
    deleteUnit: storeDeleteUnit,
  } = useUnitStore();

  const units = sortAlpha(storeUnits, "name");

  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState("");
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  const handleOpenUnitForm = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitName(unit.name);
    } else {
      setEditingUnit(null);
      setUnitName("");
    }
    setUnitFormOpen(true);
  };

  const handleSaveUnit = () => {
    if (!unitName.trim()) {
      toast({
        title: "Error",
        description: "Nama satuan harus diisi",
        variant: "destructive",
      });
      return;
    }

    let result;
    if (editingUnit) {
      result = storeUpdateUnit(editingUnit.id, unitName);
    } else {
      result = storeAddUnit(unitName);
    }

    if (!result) {
      toast({
        title: "Error",
        description: "Nama satuan sudah digunakan",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: editingUnit ? "Satuan diperbarui" : "Satuan ditambahkan",
    });
    setUnitFormOpen(false);
  };

  const handleDeleteUnit = () => {
    if (!unitToDelete) return;

    if (isUnitInUse(unitToDelete.name)) {
      toast({
        title: "Error",
        description:
          "Satuan sedang digunakan oleh produk/item dan tidak dapat dihapus",
        variant: "destructive",
      });
      setUnitToDelete(null);
      return;
    }

    const success = storeDeleteUnit(unitToDelete.id);
    if (success) {
      toast({ title: "Berhasil", description: "Satuan dihapus" });
    } else {
      toast({
        title: "Error",
        description: "Minimal harus ada satu satuan",
        variant: "destructive",
      });
    }
    setUnitToDelete(null);
  };

  return (
    <div className="space-y-4 w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex justify-center w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-2 h-10 p-1">
            <TabsTrigger value="categories" className="gap-2 text-sm h-8 font-medium">
              <Tags className="h-4 w-4" />
              Kategori
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-2 text-sm h-8 font-medium">
              <Scale className="h-4 w-4" />
              Satuan
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories" className="space-y-3 w-full mt-0">
          <CategoryListManager />
        </TabsContent>

        <TabsContent value="units" className="space-y-3 w-full mt-0">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Daftar Satuan ({units.length})
            </h3>
            <Button onClick={() => handleOpenUnitForm()} className="h-10 gap-2 text-sm font-medium px-4">
              <Plus className="h-4 w-4" />
              <span>Tambah Satuan</span>
            </Button>
          </div>

          <div className="hidden sm:block overflow-x-auto w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">Nama Satuan</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-3 font-medium text-foreground">{unit.name}</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenUnitForm(unit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUnitToDelete(unit)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border/30 w-full">
            {units.map((unit) => (
              <div key={unit.id} className="py-3.5 px-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-foreground truncate">{unit.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenUnitForm(unit)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setUnitToDelete(unit)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>



      <Dialog open={unitFormOpen} onOpenChange={setUnitFormOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-xl font-bold">
              {editingUnit ? "Edit Satuan" : "Tambah Satuan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nama Satuan *</Label>
              <Input
                placeholder="Contoh: Pcs, Kg, Lusin"
                value={unitName}
                onChange={(e) => handleTitleCaseChange(e, setUnitName)}
                maxLength={20}
                className="h-10 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => setUnitFormOpen(false)}
            >
              Batal
            </Button>
            <Button className="flex-1 h-10 text-sm font-medium" onClick={handleSaveUnit}>
              Simpan Satuan
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      <ConfirmDeleteDialog
        open={!!unitToDelete}
        onOpenChange={(open) => !open && setUnitToDelete(null)}
        title="Hapus Satuan?"
        description={`Apakah Anda yakin ingin menghapus satuan "${unitToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteUnit}
      />
    </div>
  );
}

