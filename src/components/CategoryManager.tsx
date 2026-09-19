import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Tag } from "lucide-react";
import { toTitleCase } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useCategoryStore } from "@/stores";
import { Category, isCategoryInUse } from "@/database/categories";
import { sortAlpha } from "@/lib/sorting";
import { SuggestInput, SuggestOption } from "@/components/SuggestInput";

// ==========================================
// 1. CategoryListManager (Inline CRUD Table)
// ==========================================

export interface CategoryListManagerProps {
  onCategoriesChange?: () => void;
  showHeader?: boolean;
}

export function CategoryListManager({
  onCategoriesChange,
  showHeader = true,
}: CategoryListManagerProps) {
  const {
    categories: storeCategories,
    addCategory: storeAddCategory,
    updateCategory: storeUpdateCategory,
    deleteCategory: storeDeleteCategory,
  } = useCategoryStore();

  const categories = sortAlpha(storeCategories, "name");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState("");

  const handleOpenForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setPrefix(category.prefix);
    } else {
      setEditingCategory(null);
      setName("");
      setPrefix("");
    }
    setError("");
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCategory(null);
    setName("");
    setPrefix("");
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    if (!prefix.trim() || prefix.length < 2) {
      setError("Prefix minimal 2 karakter");
      return;
    }

    if (prefix.length > 3) {
      setError("Prefix maksimal 3 karakter");
      return;
    }

    let result: Category | null;
    if (editingCategory) {
      result = storeUpdateCategory(editingCategory.id, name.trim(), prefix.trim());
      if (result) {
        toast({
          title: "Kategori Diperbarui",
          description: `Kategori "${result.name}" berhasil diperbarui`,
        });
      }
    } else {
      result = storeAddCategory(name.trim(), prefix.trim());
      if (result) {
        toast({
          title: "Kategori Ditambahkan",
          description: `Kategori "${result.name}" berhasil ditambahkan`,
        });
      }
    }

    if (!result) {
      setError("Nama atau prefix kategori sudah digunakan");
      return;
    }

    handleCloseForm();
    onCategoriesChange?.();
  };

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;

    if (isCategoryInUse(deletingCategory.name)) {
      toast({
        title: "Gagal Menghapus",
        description: `Kategori "${deletingCategory.name}" sedang digunakan oleh produk dan tidak dapat dihapus.`,
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      return;
    }

    const ok = storeDeleteCategory(deletingCategory.id);
    if (ok) {
      toast({
        title: "Kategori Dihapus",
        description: `Kategori "${deletingCategory.name}" berhasil dihapus.`,
      });
      onCategoriesChange?.();
    } else {
      toast({
        title: "Gagal Menghapus",
        description: "Minimal harus ada satu kategori",
        variant: "destructive",
      });
    }

    setDeleteDialogOpen(false);
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-4 w-full">
      {showHeader && (
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Daftar Kategori Produk ({categories.length})
          </h3>
          <Button onClick={() => handleOpenForm()} className="h-10 gap-2 text-sm font-medium px-4">
            <Plus className="h-4 w-4" />
            <span>Tambah Kategori</span>
          </Button>
        </div>
      )}

      {/* Desktop / Tablet Table */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">Nama Kategori</th>
              <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">Prefix SKU</th>
              <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {categories.map((category) => {
              const inUse = isCategoryInUse(category.name);
              return (
                <tr key={category.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{category.name}</span>
                      {inUse && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          Digunakan
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <code className="bg-muted/60 px-2.5 py-1 rounded text-xs font-mono font-bold text-foreground">
                      {category.prefix}
                    </code>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenForm(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(category)}
                        disabled={inUse}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile List */}
      <div className="sm:hidden divide-y divide-border/30 w-full">
        {categories.map((category) => {
          const inUse = isCategoryInUse(category.name);
          return (
            <div key={category.id} className="py-3.5 px-1 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                <span className="font-semibold text-sm text-foreground truncate">{category.name}</span>
                {inUse && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                    Digunakan
                  </Badge>
                )}
                <code className="bg-muted/60 px-2 py-0.5 rounded text-xs font-mono text-muted-foreground shrink-0">
                  {category.prefix}
                </code>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenForm(category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteClick(category)}
                  disabled={inUse}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Prefix digunakan untuk generate SKU otomatis (contoh: MKN0001)
      </p>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-sm p-4 sm:p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold">
              {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoryName" className="text-sm font-medium">Nama Kategori *</Label>
              <Input
                id="categoryName"
                value={name}
                onChange={(e) => setName(toTitleCase(e.target.value))}
                placeholder="Contoh: Makanan Instan"
                maxLength={30}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryPrefix" className="text-sm font-medium">Prefix SKU (2-3 huruf) *</Label>
              <Input
                id="categoryPrefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="Contoh: MKN"
                maxLength={3}
                className="h-10 text-sm font-mono uppercase"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 text-sm font-medium"
                onClick={handleCloseForm}
              >
                Batal
              </Button>
              <Button type="submit" className="flex-1 h-10 text-sm font-medium">
                {editingCategory ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Kategori?"
        description={`Kategori "${deletingCategory?.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ==========================================
// 2. CategoryManager (Popup Modal Wrapper)
// ==========================================

export interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  onCategoriesChange?: () => void;
}

export function CategoryManager({
  open,
  onClose,
  onCategoriesChange,
}: CategoryManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Kelola Kategori
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tambah, ubah, atau hapus kategori produk warung
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <CategoryListManager
            onCategoriesChange={onCategoriesChange}
            showHeader={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 3. CategorySelect (Form Auto-Suggest Input)
// ==========================================

export interface CategorySelectProps {
  value: string;
  categories: string[];
  onValueChange: (value: string) => void;
  onCategoriesChanged?: () => void;
}

export function CategorySelect({
  value,
  categories,
  onValueChange,
  onCategoriesChanged,
}: CategorySelectProps) {
  const [search, setSearch] = useState(value);
  const { addCategory: storeAddCategory } = useCategoryStore();

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const generatePrefix = (name: string): string => {
    const clean = name.trim().toUpperCase();
    if (clean.length <= 3) return clean;
    const consonants = clean.replace(/[AIUEO\s]/g, "");
    if (consonants.length >= 3) return consonants.substring(0, 3);
    return clean.substring(0, 3);
  };

  const handleCreateCategory = (name: string) => {
    const titleCaseName = toTitleCase(name.trim());
    if (!titleCaseName) return;

    const exists = categories.find(
      (c) => c.toLowerCase() === titleCaseName.toLowerCase(),
    );

    if (exists) {
      onValueChange(exists);
      setSearch(exists);
    } else {
      const prefix = generatePrefix(titleCaseName);
      const result = storeAddCategory(titleCaseName, prefix);
      if (result) {
        onValueChange(result.name);
        setSearch(result.name);
        onCategoriesChanged?.();
      }
    }
  };

  const options: SuggestOption[] = categories.map((cat) => ({
    id: cat,
    label: cat,
  }));

  const exactMatch = categories.some(
    (c) => c.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <SuggestInput
      value={search}
      options={options}
      placeholder="Ketik atau cari kategori..."
      onChange={(val) => {
        setSearch(val);
        onValueChange(val);
      }}
      onSelectOption={(opt) => {
        onValueChange(opt.label);
        setSearch(opt.label);
      }}
      onBlur={() => {
        const trimmed = search.trim();
        if (trimmed && !exactMatch) {
          handleCreateCategory(trimmed);
        }
      }}
    />
  );
}
