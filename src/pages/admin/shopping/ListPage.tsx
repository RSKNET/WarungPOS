import { useState, useMemo, useEffect, useRef } from "react";
import { ShoppingCategory, ShoppingItem } from "@/types/shopping-list";
import {
  getShoppingCategories,
  createShoppingCategory,
  deleteShoppingCategory,
  getShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  toggleShoppingItemPurchased,

  checkAndAutoArchive,

  archivePurchasedItems,
} from "@/database/shopping-list";
import { getUnitNames } from "@/database/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitSelect } from "@/components/UnitSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  FolderPlus,
  Search,
  ChevronDown,
  FileDown,
  Pencil,
  CheckSquare,
  XCircle,
  ShoppingCart,
  Archive,
  ArrowRightLeft,
  MoreVertical,
  Camera,
  ImageIcon,
  X,
} from "lucide-react";
import { convertToWebP } from "@/lib/image-utils";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { cn } from "@/lib/utils";
import { sortAlpha, sortShoppingItems } from "@/lib/sorting";
import { exportShoppingListPdf } from "./pdf";
import {
  CategoryDialog,
  EditItemDialog,
  BulkAddDialog,
  MoveDialog,
  PhotoModal,
} from "./components";
import { BulkItemInput } from "./types";

export function ListPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ShoppingCategory[]>(
    getShoppingCategories,
  );
  const [items, setItems] = useState<ShoppingItem[]>(getShoppingItems);
  const [units, setUnits] = useState<string[]>(getUnitNames);

  useEffect(() => {
    const archivedCount = checkAndAutoArchive();
    if (archivedCount > 0) {
      toast({
        title: "Arsip Otomatis",
        description: `${archivedCount} item yang sudah dibeli telah diarsipkan`,
      });
      refreshData();
    }
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [moveCategorySourceId, setMoveCategorySourceId] = useState("");
  const [moveCategoryId, setMoveCategoryId] = useState("");
  const [moveNewCategoryName, setMoveNewCategoryName] = useState("");

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    formOpen,
    bulkFormOpen,
    categoryFormOpen,
    deleteConfirmOpen,
    clearConfirmOpen,
    archiveConfirmOpen,
    moveDialogOpen,
  ]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(getShoppingCategories().map((c) => c.id)),
  );

  const [newCategoryName, setNewCategoryName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formData, setFormData] = useState({
    productName: "",
    brand: "",
    quantity: "",
    unit: units[0] || "Pcs",
  });
  const [formPhoto, setFormPhoto] = useState<string | null>(null);

  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkItems, setBulkItems] = useState<BulkItemInput[]>([]);
  const [categoryItems, setCategoryItems] = useState<BulkItemInput[]>([
    {
      id: crypto.randomUUID(),
      productName: "",
      brand: "",
      quantity: "",
      unit: units[0] || "Pcs",
    },
  ]);

  const purchasedItems = items.filter((i) => i.isPurchased).length;
  const hasMoreActions =
    selectedItems.size > 0 ||
    purchasedItems > 0 ||
    (categories.length > 0 && items.length > 0);

  const handleExportPDF = () => {
    exportShoppingListPdf(items, categories);
  };

  const toggleCollapse = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    const sorted = sortAlpha(categories, "name");
    if (!searchQuery) return sorted;
    const lowerQuery = searchQuery.toLowerCase();
    const matchingCategoryIds = new Set(
      items
        .filter(
          (i) =>
            i.productName.toLowerCase().includes(lowerQuery) ||
            i.brand.toLowerCase().includes(lowerQuery),
        )
        .map((i) => i.categoryId),
    );
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        matchingCategoryIds.has(c.id),
    );
  }, [categories, items, searchQuery]);

  const refreshData = () => {
    setCategories(getShoppingCategories());
    setItems(getShoppingItems());
    setUnits(getUnitNames());
  };

  const openAddCategoryDialog = () => {
    setNewCategoryName("");
    setCategoryItems([
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
      },
    ]);
    setCategoryFormOpen(true);
  };

  const addCategoryItemRow = () => {
    setCategoryItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
      },
    ]);
  };

  const updateCategoryItem = (
    id: string,
    field: keyof BulkItemInput,
    value: string,
  ) => {
    setCategoryItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeCategoryItemRow = (id: string) => {
    if (categoryItems.length <= 1) return;
    setCategoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Nama kategori harus diisi",
        variant: "destructive",
      });
      return;
    }

    const validItems = categoryItems.filter((item) => item.productName.trim());
    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Minimal masukkan 1 nama produk untuk kategori ini",
        variant: "destructive",
      });
      return;
    }

    const newCategory = createShoppingCategory(newCategoryName.trim());
    validItems.forEach((item) => {
      createShoppingItem({
        categoryId: newCategory.id,
        categoryName: newCategory.name,
        productName: item.productName.trim(),
        brand: item.brand.trim(),
        quantity: parseInt(item.quantity) || 1,
        unit: item.unit,
        photo: item.photo || undefined,
      });
    });

    setNewCategoryName("");
    setCategoryItems([
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
      },
    ]);
    setCategoryFormOpen(false);
    refreshData();

    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.delete(newCategory.id);
      return next;
    });

    toast({
      title: "Berhasil",
      description: `Kategori "${newCategory.name}" dengan ${validItems.length} produk berhasil ditambahkan`,
    });
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;
    deleteShoppingCategory(categoryToDelete);
    setCategoryToDelete(null);
    setDeleteConfirmOpen(false);
    refreshData();

    toast({ title: "Berhasil", description: "Kategori dihapus" });
  };

  const openEditItemDialog = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormCategoryId(item.categoryId);
    setFormData({
      productName: item.productName,
      brand: item.brand,
      quantity: item.quantity.toString(),
      unit: item.unit,
    });
    setFormPhoto(item.photo || null);
    setFormOpen(true);
  };

  const openBulkAddDialog = (categoryId: string) => {
    setBulkCategoryId(categoryId);
    setBulkItems([
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
      },
    ]);
    setBulkFormOpen(true);
  };

  const handleSaveItem = () => {
    if (!formCategoryId) {
      toast({
        title: "Error",
        description: "Pilih kategori terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formData.productName.trim()) {
      toast({
        title: "Error",
        description: "Nama produk harus diisi",
        variant: "destructive",
      });
      return;
    }

    const category = categories.find((c) => c.id === formCategoryId);
    if (!category) return;

    const quantity = parseInt(formData.quantity) || 1;

    if (editingItem) {
      updateShoppingItem(editingItem.id, {
        productName: formData.productName.trim(),
        brand: formData.brand.trim(),
        quantity,
        unit: formData.unit,
        photo: formPhoto || undefined,
      });
      toast({ title: "Berhasil", description: "Item diperbarui" });
    } else {
      createShoppingItem({
        categoryId: formCategoryId,
        categoryName: category.name,
        productName: formData.productName.trim(),
        brand: formData.brand.trim(),
        quantity,
        unit: formData.unit,
        photo: formPhoto || undefined,
      });
      toast({ title: "Berhasil", description: "Item ditambahkan" });
    }

    setFormOpen(false);
    setEditingItem(null);
    setFormPhoto(null);
    refreshData();
  };

  const handleBulkAdd = () => {
    const category = categories.find((c) => c.id === bulkCategoryId);
    if (!category) return;

    const validItems = bulkItems.filter((item) => item.productName.trim());
    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Minimal isi satu nama produk",
        variant: "destructive",
      });
      return;
    }

    validItems.forEach((item) => {
      createShoppingItem({
        categoryId: bulkCategoryId,
        categoryName: category.name,
        productName: item.productName.trim(),
        brand: item.brand.trim(),
        quantity: parseInt(item.quantity) || 1,
        unit: item.unit,
        photo: item.photo || undefined,
      });
    });

    toast({
      title: "Berhasil",
      description: `${validItems.length} item ditambahkan`,
    });
    setBulkFormOpen(false);
    refreshData();
  };

  const addBulkItemRow = () => {
    setBulkItems([
      ...bulkItems,
      {
        id: crypto.randomUUID(),
        productName: "",
        brand: "",
        quantity: "",
        unit: units[0] || "Pcs",
      },
    ]);
  };

  const updateBulkItem = (
    id: string,
    field: keyof BulkItemInput,
    value: string,
  ) => {
    setBulkItems(
      bulkItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeBulkItemRow = (id: string) => {
    if (bulkItems.length <= 1) return;
    setBulkItems(bulkItems.filter((item) => item.id !== id));
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    deleteShoppingItem(itemToDelete);
    setItemToDelete(null);
    setDeleteConfirmOpen(false);
    refreshData();

    toast({ title: "Berhasil", description: "Item dihapus" });
  };

  const handleToggleAllInCategory = (categoryId: string) => {
    const categoryItems = items.filter((i) => i.categoryId === categoryId);
    const allSelected = categoryItems.length > 0 && categoryItems.every((i) => selectedItems.has(i.id));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      categoryItems.forEach((i) => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const getSelectedInCategory = (categoryId: string) => {
    return items.filter(
      (i) => i.categoryId === categoryId && selectedItems.has(i.id),
    );
  };

  const handleToggleSelectedPurchased = (categoryId: string) => {
    const selected = getSelectedInCategory(categoryId);
    const allPurchased = selected.every((i) => i.isPurchased);
    selected.forEach((item) => {
      if (allPurchased && item.isPurchased) {
        toggleShoppingItemPurchased(item.id);
      } else if (!allPurchased && !item.isPurchased) {
        toggleShoppingItemPurchased(item.id);
      }
    });
    setSelectedItems((prev) => {
      const next = new Set(prev);
      selected.forEach((i) => next.delete(i.id));
      return next;
    });
    refreshData();
    toast({
      title: "Berhasil",
      description: allPurchased
        ? `${selected.length} item dikembalikan ke belum dibeli`
        : `${selected.length} item ditandai sudah dibeli`,
    });
  };

  const handleDeleteSelected = () => {
    const selected = items.filter((i) => selectedItems.has(i.id));
    selected.forEach((item) => deleteShoppingItem(item.id));
    setClearConfirmOpen(false);
    setSelectedItems(new Set());
    refreshData();
    toast({ title: "Berhasil", description: `${selected.length} item dihapus` });
  };

  const handleArchivePurchased = () => {
    const count = archivePurchasedItems();
    setArchiveConfirmOpen(false);
    refreshData();
    toast({ title: "Berhasil", description: `${count} item telah diarsipkan` });
  };

  const openBulkMoveDialog = () => {
    setMoveCategoryId("");
    setMoveNewCategoryName("");
    setMoveDialogOpen(true);
  };

  const handleMoveItems = () => {
    const itemsToMove = items.filter((i) => selectedItems.has(i.id) && i.categoryId === moveCategorySourceId);
    if (itemsToMove.length === 0) return;

    let targetCategoryId = moveCategoryId;
    let targetCategoryName = "";

    if (moveCategoryId === "__new__") {
      if (!moveNewCategoryName.trim()) {
        toast({
          title: "Error",
          description: "Nama kategori baru harus diisi",
          variant: "destructive",
        });
        return;
      }
      const newCat = createShoppingCategory(moveNewCategoryName.trim());
      targetCategoryId = newCat.id;
      targetCategoryName = newCat.name;
    } else {
      const cat = categories.find((c) => c.id === moveCategoryId);
      if (!cat) return;
      targetCategoryName = cat.name;
    }

    itemsToMove.forEach((item) => {
      updateShoppingItem(item.id, {
        categoryId: targetCategoryId,
        categoryName: targetCategoryName,
      });
    });

    setMoveDialogOpen(false);
    setSelectedItems(new Set());
    refreshData();

    toast({
      title: "Berhasil",
      description: `${itemsToMove.length} item dipindahkan ke ${targetCategoryName}`,
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex gap-2.5 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari item atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
            maxLength={50}
            disabled={isSearchDisabled}
          />
        </div>
        <Button
          className="sm:hidden shrink-0 h-10 w-10 p-0"
          onClick={openAddCategoryDialog}
          title="Tambah Kategori"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Button
          className="hidden sm:inline-flex h-10 px-4 text-sm font-medium gap-2"
          onClick={openAddCategoryDialog}
        >
          <FolderPlus className="h-4 w-4" />
          Tambah Kategori
        </Button>
        {hasMoreActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 w-10 p-0 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {selectedItems.size > 0 && (
                <DropdownMenuItem onClick={() => setClearConfirmOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Dipilih ({selectedItems.size})
                </DropdownMenuItem>
              )}
              {purchasedItems > 0 && (
                <DropdownMenuItem onClick={() => setArchiveConfirmOpen(true)}>
                  <Archive className="w-4 h-4 mr-2 text-blue-600" />
                  Arsipkan ({purchasedItems})
                </DropdownMenuItem>
              )}
              {categories.length > 0 && items.length > 0 && (
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">Belum ada kategori belanja</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tambahkan kategori belanja terlebih dahulu untuk mulai mencatat kebutuhan</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">Tidak ada item yang cocok</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Coba kata kunci pencarian yang lain</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const categoryItems = items.filter(
              (i) => i.categoryId === category.id,
            );

            const filteredItems = searchQuery
              ? categoryItems.filter(
                (i) =>
                  i.productName
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  i.brand.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              : categoryItems;

            const sortedItems = sortShoppingItems(filteredItems);

            return (
              <div key={category.id} className="border-b border-border/40 pb-4">
                <div className="py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => toggleCollapse(category.id)}
                    className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        collapsedCategories.has(category.id) && "-rotate-90",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">{category.name}</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {categoryItems.length} item
                      </Badge>
                    </div>
                  </button>
                  <div className="flex gap-1.5 items-center">
                    {getSelectedInCategory(category.id).length > 0 && (
                      <>
                        {(() => {
                          const selected = getSelectedInCategory(category.id);
                          const allPurchased = selected.every((i) => i.isPurchased);
                          return (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleSelectedPurchased(category.id)}
                              title={allPurchased ? "Batalkan sudah dibeli" : "Tandai sudah dibeli"}
                            >
                              {allPurchased ? (
                                <XCircle className="w-4 h-4 text-orange-500" />
                              ) : (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                          );
                        })()}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setMoveCategorySourceId(category.id);
                            openBulkMoveDialog();
                          }}
                          title={`Pindah ${getSelectedInCategory(category.id).length} item`}
                        >
                          <ArrowRightLeft className="w-4 h-4 text-primary" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openBulkAddDialog(category.id)}
                      title="Tambah item"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setCategoryToDelete(category.id);
                        setDeleteConfirmOpen(true);
                      }}
                      title="Hapus kategori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {!collapsedCategories.has(category.id) && (
                  <div className="pt-1">
                    {sortedItems.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6 px-3 text-sm">
                        {searchQuery
                          ? "Tidak ada item yang cocok"
                          : "Belum ada item dalam kategori ini"}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table
                          className="w-full text-sm table-fixed"
                        >
                          <thead>
                            <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <th className="w-8 py-3 px-2 text-center">
                                <Checkbox
                                  checked={
                                    categoryItems.length > 0 &&
                                    categoryItems.every((i) => selectedItems.has(i.id))
                                  }
                                  onCheckedChange={() =>
                                    handleToggleAllInCategory(category.id)
                                  }
                                />
                              </th>
                              <th className="w-9 py-3 px-1 text-center"></th>
                              <th className="w-[35%] text-left py-3 pr-2 pl-0 font-semibold">
                                Produk
                              </th>
                              <th className="w-[25%] text-left py-3 pr-2 pl-0 font-semibold">
                                Merk
                              </th>
                              <th className="w-[20%] text-left py-3 pr-2 pl-0 font-semibold">
                                Jumlah
                              </th>
                              <th className="w-24 py-3 px-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedItems.map((item) => (
                              <tr
                                key={item.id}
                                className={cn(
                                  "border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors",
                                  item.isPurchased &&
                                  "bg-emerald-500/5",
                                )}
                              >
                                <td className="py-3.5 px-2 text-center">
                                  <Checkbox
                                    checked={selectedItems.has(item.id)}
                                    onCheckedChange={() =>
                                      toggleSelectItem(item.id)
                                    }
                                  />
                                </td>
                                <td className="py-3.5 px-1 text-center">
                                  {item.photo ? (
                                    <img
                                      src={item.photo}
                                      alt=""
                                      className="w-7 h-7 rounded object-cover cursor-pointer mx-auto border border-border/50"
                                      onClick={() => setViewPhoto(item.photo!)}
                                    />
                                  ) : null}
                                </td>
                                <td
                                  className={cn(
                                    "py-3.5 pr-2 pl-0 font-medium text-foreground",
                                    item.isPurchased &&
                                    "line-through text-muted-foreground",
                                  )}
                                >
                                  {item.productName}
                                </td>
                                <td
                                  className={cn(
                                    "py-3.5 pr-2 pl-0 text-muted-foreground",
                                    item.isPurchased && "line-through",
                                  )}
                                >
                                  {item.brand || "-"}
                                </td>
                                <td
                                  className={cn(
                                    "py-3.5 pr-2 pl-0 font-mono text-muted-foreground",
                                    item.isPurchased && "line-through",
                                  )}
                                >
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-3.5 px-2">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        toggleShoppingItemPurchased(item.id);
                                        refreshData();
                                        toast({
                                          title: item.isPurchased ? "Item dikembalikan" : "Item ditandai dibeli",
                                        });
                                      }}
                                      title={item.isPurchased ? "Batalkan dibeli" : "Tandai dibeli"}
                                    >
                                      {item.isPurchased ? (
                                        <XCircle className="w-4 h-4 text-orange-500" />
                                      ) : (
                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                      )}
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditItemDialog(item)}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedItems(new Set([item.id]));
                                            setMoveCategorySourceId(item.categoryId);
                                            openBulkMoveDialog();
                                          }}
                                        >
                                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                                          Pindah Kategori
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => {
                                            setItemToDelete(item.id);
                                            setDeleteConfirmOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Hapus
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CategoryDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        categoryItems={categoryItems}
        setCategoryItems={setCategoryItems}
        units={units}
        refreshData={refreshData}
        onSave={handleAddCategory}
      />

      <EditItemDialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormPhoto(null);
            setEditingItem(null);
          }
          setFormOpen(open);
        }}
        formData={formData}
        setFormData={setFormData}
        formPhoto={formPhoto}
        setFormPhoto={setFormPhoto}
        units={units}
        refreshData={refreshData}
        onSave={handleSaveItem}
      />

      <BulkAddDialog
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
        bulkCategoryId={bulkCategoryId}
        setBulkCategoryId={setBulkCategoryId}
        bulkItems={bulkItems}
        setBulkItems={setBulkItems}
        categories={categories}
        units={units}
        refreshData={refreshData}
        onSave={handleBulkAdd}
      />

      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={categoryToDelete ? "Hapus Kategori?" : "Hapus Item?"}
        description={
          categoryToDelete
            ? "Kategori dan semua item di dalamnya akan dihapus."
            : "Item ini akan dihapus dari daftar belanja."
        }
        onCancel={() => {
          setCategoryToDelete(null);
          setItemToDelete(null);
        }}
        onConfirm={categoryToDelete ? handleDeleteCategory : handleDeleteItem}
      />

      <ConfirmDeleteDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title={`Hapus ${selectedItems.size} Item Dipilih?`}
        description="Item yang dipilih akan dihapus dari daftar belanja."
        onConfirm={handleDeleteSelected}
      />

      <ConfirmDeleteDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Arsipkan Item Sudah Dibeli?"
        description={`${purchasedItems} item yang sudah dibeli akan dipindahkan ke arsip dan dapat dilihat di halaman Arsip Belanja.`}
        confirmText="Arsipkan"
        isDestructive={false}
        onConfirm={handleArchivePurchased}
      />

      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        items={items}
        selectedItems={selectedItems}
        sourceCategoryId={moveCategorySourceId}
        categories={categories}
        moveCategoryId={moveCategoryId}
        setMoveCategoryId={setMoveCategoryId}
        moveNewCategoryName={moveNewCategoryName}
        setMoveNewCategoryName={setMoveNewCategoryName}
        onConfirm={handleMoveItems}
      />

      <PhotoModal
        photoUrl={viewPhoto}
        onClose={() => setViewPhoto(null)}
      />
    </div>
  );
}

export { ListPage as ShoppingListPage };

