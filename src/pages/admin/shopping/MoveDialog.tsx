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
import { ArrowRightLeft, FolderPlus } from "lucide-react";
import { handleTitleCaseChange } from "@/lib/text";
import { sortAlpha } from "@/lib/sorting";
import { ShoppingItem, ShoppingCategory } from "@/types/shopping-list";

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShoppingItem[];
  selectedItems: Set<string>;
  sourceCategoryId: string;
  categories: ShoppingCategory[];
  moveCategoryId: string;
  setMoveCategoryId: (id: string) => void;
  moveNewCategoryName: string;
  setMoveNewCategoryName: (name: string) => void;
  onConfirm: () => void;
}

export type ShoppingMoveDialogProps = MoveDialogProps;

export function MoveDialog({
  open,
  onOpenChange,
  items,
  selectedItems,
  sourceCategoryId,
  categories,
  moveCategoryId,
  setMoveCategoryId,
  moveNewCategoryName,
  setMoveNewCategoryName,
  onConfirm,
}: MoveDialogProps) {
  const selected = items.filter(
    (i) => selectedItems.has(i.id) && i.categoryId === sourceCategoryId,
  );

  const availableCategories = categories.filter(
    (c: ShoppingCategory) =>
      !selected.every((s) => s.categoryId === c.id) ||
      selected.some((s) => s.categoryId !== c.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Pindah Kategori
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/30 text-sm">
            <span className="font-semibold text-foreground">
              {selected.length} item dipilih
            </span>
            <ul className="mt-1.5 text-muted-foreground text-xs space-y-1">
              {selected.map((item) => (
                <li key={item.id}>
                  • {item.productName}
                  {item.brand ? ` — ${item.brand}` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pindah ke Kategori *</Label>
            <Select value={moveCategoryId} onValueChange={setMoveCategoryId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Pilih kategori tujuan..." />
              </SelectTrigger>
              <SelectContent>
                {sortAlpha(availableCategories, "name").map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem
                  value="__new__"
                  className="text-primary font-medium border-t mt-1 pt-2"
                >
                  <span className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Kategori Baru...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {moveCategoryId === "__new__" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nama Kategori Baru *</Label>
              <Input
                placeholder="Contoh: Minuman, Snack"
                value={moveNewCategoryName}
                onChange={(e) =>
                  handleTitleCaseChange(e, setMoveNewCategoryName)
                }
                maxLength={50}
                autoFocus
                className="h-10 text-sm"
              />
            </div>
          )}
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
            onClick={onConfirm}
            disabled={!moveCategoryId}
          >
            Pindahkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MoveDialog as ShoppingMoveDialog };

