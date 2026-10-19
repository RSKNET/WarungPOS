import { ShoppingCategory, ShoppingItem } from "@/types/shopping-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  CheckSquare,
  XCircle,
  ArrowRightLeft,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sortShoppingItems } from "@/lib/sorting";

export interface ShoppingCategorySectionProps {
  category: ShoppingCategory;
  categoryItems: ShoppingItem[];
  searchQuery: string;
  isCollapsed: boolean;
  selectedItems: Set<string>;
  onToggleCollapse: (categoryId: string) => void;
  onToggleAllInCategory: (categoryId: string) => void;
  onToggleSelectItem: (itemId: string) => void;
  onToggleSelectedPurchased: (categoryId: string) => void;
  onOpenBulkMove: (categoryId: string) => void;
  onOpenBulkAdd: (categoryId: string) => void;
  onConfirmDeleteCategory: (categoryId: string) => void;
  onToggleItemPurchased: (item: ShoppingItem) => void;
  onEditItem: (item: ShoppingItem) => void;
  onMoveSingleItem: (item: ShoppingItem) => void;
  onConfirmDeleteItem: (itemId: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

export function ShoppingCategorySection({
  category,
  categoryItems,
  searchQuery,
  isCollapsed,
  selectedItems,
  onToggleCollapse,
  onToggleAllInCategory,
  onToggleSelectItem,
  onToggleSelectedPurchased,
  onOpenBulkMove,
  onOpenBulkAdd,
  onConfirmDeleteCategory,
  onToggleItemPurchased,
  onEditItem,
  onMoveSingleItem,
  onConfirmDeleteItem,
  onViewPhoto,
}: ShoppingCategorySectionProps) {
  const filteredItems = searchQuery
    ? categoryItems.filter(
        (i) =>
          i.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.brand.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : categoryItems;

  const sortedItems = sortShoppingItems(filteredItems);
  const selectedInCategory = categoryItems.filter((i) => selectedItems.has(i.id));
  const allSelectedPurchased =
    selectedInCategory.length > 0 && selectedInCategory.every((i) => i.isPurchased);

  return (
    <div className="border-b border-border/40 pb-4">
      <div className="py-2.5 flex items-center justify-between">
        <button
          onClick={() => onToggleCollapse(category.id)}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isCollapsed && "-rotate-90",
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
          {selectedInCategory.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onToggleSelectedPurchased(category.id)}
                title={allSelectedPurchased ? "Batalkan sudah dibeli" : "Tandai sudah dibeli"}
              >
                {allSelectedPurchased ? (
                  <XCircle className="w-4 h-4 text-orange-500" />
                ) : (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenBulkMove(category.id)}
                title={`Pindah ${selectedInCategory.length} item`}
              >
                <ArrowRightLeft className="w-4 h-4 text-primary" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenBulkAdd(category.id)}
            title="Tambah item"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onConfirmDeleteCategory(category.id)}
            title="Hapus kategori"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="pt-1">
          {sortedItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 px-3 text-sm">
              {searchQuery
                ? "Tidak ada item yang cocok"
                : "Belum ada item dalam kategori ini"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-8 py-3 px-2 text-center">
                      <Checkbox
                        checked={
                          categoryItems.length > 0 &&
                          categoryItems.every((i) => selectedItems.has(i.id))
                        }
                        onCheckedChange={() => onToggleAllInCategory(category.id)}
                      />
                    </th>
                    <th className="w-9 py-3 px-1 text-center"></th>
                    <th className="w-[35%] text-left py-3 pr-2 pl-0 font-semibold">Produk</th>
                    <th className="w-[25%] text-left py-3 pr-2 pl-0 font-semibold">Merk</th>
                    <th className="w-[20%] text-left py-3 pr-2 pl-0 font-semibold">Jumlah</th>
                    <th className="w-24 py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors",
                        item.isPurchased && "bg-emerald-500/5",
                      )}
                    >
                      <td className="py-3.5 px-2 text-center">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => onToggleSelectItem(item.id)}
                        />
                      </td>
                      <td className="py-3.5 px-1 text-center">
                        {item.photo ? (
                          <img
                            src={item.photo}
                            alt=""
                            className="w-7 h-7 rounded object-cover cursor-pointer mx-auto border border-border/50"
                            onClick={() => onViewPhoto(item.photo!)}
                          />
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "py-3.5 pr-2 pl-0 font-medium text-foreground",
                          item.isPurchased && "line-through text-muted-foreground",
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
                            onClick={() => onToggleItemPurchased(item)}
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
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditItem(item)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onMoveSingleItem(item)}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Pindah Kategori
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onConfirmDeleteItem(item.id)}
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
}
