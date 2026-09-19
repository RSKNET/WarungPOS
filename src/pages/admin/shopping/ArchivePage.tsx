import { useState, useEffect, Fragment } from "react";
import { ShoppingArchiveByCategory } from "@/types/shopping-list";
import {
  getArchivedItemsByCategory,
  deleteArchivedItemsByDate,
  clearAllArchived,
  checkAndAutoArchive,
} from "@/database/shopping-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { Trash2, Archive, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compareAlpha } from "@/lib/sorting";
import { cn } from "@/lib/utils";

export function ArchivePage() {
  const { toast } = useToast();
  const [archivedByCategory, setArchivedByCategory] = useState<
    ShoppingArchiveByCategory[]
  >([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const archivedCount = checkAndAutoArchive();
    if (archivedCount > 0) {
      toast({
        title: "Arsip Otomatis",
        description: `${archivedCount} item yang sudah dibeli telah diarsipkan`,
      });
    }
    refreshData();
  }, []);

  const refreshData = () => {
    const data = getArchivedItemsByCategory();
    data.sort((a, b) => compareAlpha(a.categoryName, b.categoryName));
    for (const cat of data) {
      for (const dg of cat.dateGroups) {
        dg.items.sort((a, b) => compareAlpha(a.productName, b.productName));
      }
    }
    setArchivedByCategory(data);

    setCollapsedCategories(new Set(data.map((c) => c.categoryId)));
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

  const handleDeleteArchivedGroup = () => {
    if (!dateToDelete) return;
    deleteArchivedItemsByDate(dateToDelete);
    setDateToDelete(null);
    setDeleteConfirmOpen(false);
    refreshData();
    toast({ title: "Berhasil", description: "Arsip dihapus" });
  };

  const handleClearAllArchived = () => {
    clearAllArchived();
    setClearAllConfirmOpen(false);
    refreshData();
    toast({ title: "Berhasil", description: "Semua arsip dihapus" });
  };

  return (
    <div className="space-y-6">
      {archivedByCategory.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setClearAllConfirmOpen(true)}
            className="h-10 px-4 text-sm font-medium gap-2 text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Hapus Semua Arsip</span>
            <span className="sm:hidden">Hapus Semua</span>
          </Button>
        </div>
      )}

      {archivedByCategory.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">Belum ada arsip belanjaan</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Item yang sudah dibeli akan otomatis diarsipkan setiap hari
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedByCategory.map((category) => (
            <div key={category.categoryId} className="border-b border-border/40 pb-4">
              <div className="py-2.5">
                <button
                  onClick={() => toggleCollapse(category.categoryId)}
                  className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      collapsedCategories.has(category.categoryId) &&
                        "-rotate-90",
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">
                      {category.categoryName}
                    </span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {category.totalItems} item
                    </Badge>
                  </div>
                </button>
              </div>
              {!collapsedCategories.has(category.categoryId) && (
                <div className="pt-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="text-left py-3 px-3">
                            Produk
                          </th>
                          <th className="text-left py-3 px-3">
                            Merk
                          </th>
                          <th className="text-center py-3 px-3">
                            Jumlah
                          </th>
                          <th className="text-right py-3 px-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.dateGroups.map((dateGroup, dateIdx) => (
                          <Fragment key={dateGroup.date}>
                            <tr className="bg-muted/30">
                              <td
                                colSpan={3}
                                className="py-2.5 px-3 font-medium text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">
                                    {dateGroup.dayName}
                                  </span>
                                  <span className="text-muted-foreground text-xs font-normal">
                                    {dateGroup.displayDate}
                                  </span>
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 h-5">
                                    {dateGroup.items.length} item
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDateToDelete(dateGroup.date);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  title="Hapus arsip tanggal ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                            {dateGroup.items.map((item, itemIdx) => (
                              <tr
                                key={item.id}
                                className={`border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors ${
                                  itemIdx === dateGroup.items.length - 1 &&
                                  dateIdx !== category.dateGroups.length - 1
                                    ? "border-b border-border/60"
                                    : ""
                                }`}
                              >
                                <td className="py-3.5 px-3 font-medium text-foreground">
                                  {item.productName}
                                </td>
                                <td className="py-3.5 px-3 text-muted-foreground">
                                  {item.brand || "-"}
                                </td>
                                <td className="py-3.5 px-3 text-center font-mono text-muted-foreground">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-3.5 px-3"></td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Arsip Tanggal Ini?"
        description="Arsip tanggal ini akan dihapus permanen."
        onCancel={() => setDateToDelete(null)}
        onConfirm={handleDeleteArchivedGroup}
      />

      <ConfirmDeleteDialog
        open={clearAllConfirmOpen}
        onOpenChange={setClearAllConfirmOpen}
        title="Hapus Semua Arsip?"
        description="Semua arsip belanjaan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Semua"
        onConfirm={handleClearAllArchived}
      />
    </div>
  );
}

export { ArchivePage as ShoppingArchivePage };


