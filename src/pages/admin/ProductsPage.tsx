import { useState, useEffect, Fragment } from "react";
import { Product, ProductVariant, ProductFormData } from "@/types/pos";
import {
  addProduct,
  updateProduct,
  waitForProducts,
  waitForVariants,
  addVariant,
  updateVariant,
  deleteVariant,
  updateVariantStock,
} from "@/database";
import { useProductStore } from "@/stores";
import { formatCurrency } from "@/lib/format";
import { ProductForm } from "@/components/ProductForm";
import { CategoryManager } from "@/components/CategoryManager";
import { ConfirmDeleteDialog } from "@/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Package,
  PackagePlus,
  PackageMinus,
  AlertCircle,
  Loader2,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductsPage() {
  const {
    products,
    variants,
    loadData: refreshStoreData,
    deleteProduct: storeDeleteProduct,
  } = useProductStore();

  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockAdjust, setStockAdjust] = useState<{
    variant: ProductVariant;
    productName: string;
    type: "add" | "subtract";
  } | null>(null);
  const [stockAmount, setStockAmount] = useState("");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const {
    searchQuery: search,
    setSearchQuery: setSearch,
    isSearchDisabled,
  } = useSearchInput([
    formOpen,
    deleteTarget !== null,
    stockAdjust !== null,
    categoryManagerOpen,
  ]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await Promise.all([
          waitForProducts(),
          waitForVariants(),
        ]);
        if (mounted) {
          refreshStoreData();
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = products.filter((p) => {
    const productMatch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const variantMatch = variants
      .filter((v) => v.productId === p.id)
      .some(
        (v) =>
          v.sku.toLowerCase().includes(search.toLowerCase()) ||
          v.name.toLowerCase().includes(search.toLowerCase()),
      );
    return productMatch || variantMatch;
  });

  const toggleExpand = (id: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddProduct = (data: ProductFormData) => {
    const trimmedName = data.name.trim();
    const existingProduct = products.find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    let targetProduct = existingProduct;
    let isNewProduct = false;

    if (!targetProduct) {
      targetProduct = addProduct({
        name: trimmedName,
        category: data.category,
      });
      isNewProduct = true;
    } else if (data.category && targetProduct.category !== data.category) {
      const updated = updateProduct(targetProduct.id, {
        category: data.category,
      });
      if (updated) targetProduct = updated;
    }

    const newVariants: ProductVariant[] = [];
    for (const v of data.variants) {
      const newV = addVariant({
        productId: targetProduct.id,
        name: v.name,
        sku: v.sku,
        costPrice: v.costPrice,
        retailPrice: v.retailPrice,
        wholesalePrice: v.wholesalePrice,
        wholesaleMinQty: v.wholesaleMinQty,
        stock: v.stock,
      });
      newVariants.push(newV);
    }

    refreshStoreData();
    setExpandedProductIds((prev) => new Set([...prev, targetProduct!.id]));

    toast({
      title: isNewProduct ? "Produk Ditambahkan" : "Varian Ditambahkan",
      description: isNewProduct
        ? `${trimmedName} dengan ${newVariants.length} varian berhasil ditambahkan`
        : `${newVariants.length} varian baru berhasil ditambahkan ke produk ${trimmedName}`,
    });
  };

  const handleEditProduct = (data: ProductFormData) => {
    if (!editingProduct) return;

    const updated = updateProduct(editingProduct.id, {
      name: data.name,
      category: data.category,
    });

    if (!updated) return;

    const existingVariants = variants.filter(
      (v) => v.productId === editingProduct.id,
    );
    const incomingIds = new Set(
      data.variants.filter((v) => v.id).map((v) => v.id!),
    );

    for (const ev of existingVariants) {
      if (!incomingIds.has(ev.id)) {
        deleteVariant(ev.id);
      }
    }

    const updatedVariants: ProductVariant[] = [];

    for (const v of data.variants) {
      if (v.id) {

        const uv = updateVariant(v.id, {
          name: v.name,
          sku: v.sku,
          costPrice: v.costPrice,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
          wholesaleMinQty: v.wholesaleMinQty,
          stock: v.stock,
        });
        if (uv) updatedVariants.push(uv);
      } else {

        const nv = addVariant({
          productId: editingProduct.id,
          name: v.name,
          sku: v.sku,
          costPrice: v.costPrice,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
          wholesaleMinQty: v.wholesaleMinQty,
          stock: v.stock,
        });
        updatedVariants.push(nv);
      }
    }

    refreshStoreData();
    setEditingProduct(null);
    toast({
      title: "Produk Diperbarui",
      description: `${data.name} berhasil diperbarui`,
    });
  };

  const handleDeleteProduct = () => {
    if (!deleteTarget) return;
    storeDeleteProduct(deleteTarget.id);
    toast({
      title: "Produk Dihapus",
      description: `${deleteTarget.name} berhasil dihapus`,
    });
    setDeleteTarget(null);
  };

  const handleStockAdjust = () => {
    if (!stockAdjust || !stockAmount) return;
    const amount = parseInt(stockAmount);
    if (isNaN(amount) || amount <= 0) return;

    const adjustedAmount =
      stockAdjust.type === "add" ? amount : -amount;
    updateVariantStock(stockAdjust.variant.id, adjustedAmount);
    refreshStoreData();
    toast({
      title: "Stok Diperbarui",
      description: `Stok ${stockAdjust.productName} (${stockAdjust.variant.name}) ${stockAdjust.type === "add" ? "ditambah" : "dikurangi"} ${amount}`,
    });
    setStockAdjust(null);
    setStockAmount("");
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama produk, SKU, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            disabled={isSearchDisabled}
          />
        </div>
        <Button onClick={() => setFormOpen(true)} className="h-10 text-sm px-4 gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Produk</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 w-10 p-0 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCategoryManagerOpen(true)} className="text-sm py-2">
              <Tag className="w-4 h-4 mr-2" />
              Kelola Kategori
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data produk...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {search ? "Tidak ada produk yang cocok" : "Belum ada data produk"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {search
              ? "Coba gunakan kata kunci pencarian lain"
              : "Tambahkan produk baru untuk mulai mengelola stok dan jualan"}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="w-9" />
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3.5">Produk</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3.5">Kategori</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right py-3.5">Modal</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right py-3.5">Jual</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right py-3.5">Grosir</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center py-3.5">Stok</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const pvs = variants.filter((v) => v.productId === product.id);
                const isExpanded = expandedProductIds.has(product.id);
                const totalStock = pvs.reduce((sum, v) => sum + v.stock, 0);

                return (
                  <Fragment key={product.id}>
                    <TableRow
                      key={product.id}
                      className="cursor-pointer border-b border-border/40 hover:bg-muted/30 transition-colors"
                      onClick={() => toggleExpand(product.id)}
                    >
                      <TableCell className="py-3.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div>
                          <p className="font-bold text-base text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pvs.length} varian
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md font-semibold">
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right text-muted-foreground text-sm">
                        —
                      </TableCell>
                      <TableCell className="py-3.5 text-right text-muted-foreground text-sm">
                        —
                      </TableCell>
                      <TableCell className="py-3.5 text-right text-muted-foreground text-sm">
                        —
                      </TableCell>
                      <TableCell className="py-3.5 text-center">
                        <span className="text-base font-bold tabular-nums">{totalStock}</span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(product);
                                setFormOpen(true);
                              }}
                              className="text-sm py-2"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Tambah Varian / Satuan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(product);
                                setFormOpen(true);
                              }}
                              className="text-sm py-2"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Produk
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(product);
                              }}
                              className="text-sm py-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus Produk
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      pvs.map((variant) => {
                        const lowStock = variant.stock <= 5;
                        const outOfStock = variant.stock === 0;
                        return (
                          <TableRow
                            key={variant.id}
                            className="bg-muted/15 border-b border-border/20 hover:bg-muted/25 transition-colors"
                          >
                            <TableCell className="py-3" />
                            <TableCell className="py-3">
                              <div className="pl-3 border-l-2 border-primary/50 space-y-0.5">
                                <p className="font-semibold text-sm text-foreground">{variant.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {variant.sku}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-muted-foreground text-xs">
                            </TableCell>
                            <TableCell className="py-3 text-right text-muted-foreground text-sm">
                              {variant.costPrice > 0
                                ? formatCurrency(variant.costPrice)
                                : "—"}
                            </TableCell>
                            <TableCell className="py-3 text-right font-bold text-sm sm:text-base tabular-nums text-foreground">
                              {formatCurrency(variant.retailPrice)}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {variant.wholesalePrice > 0 ? (
                                <div>
                                  <p className="font-bold text-sm sm:text-base tabular-nums text-foreground">
                                    {formatCurrency(variant.wholesalePrice)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    min. {variant.wholesaleMinQty}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums",
                                  outOfStock
                                    ? "bg-destructive/10 text-destructive"
                                    : lowStock
                                      ? "bg-warning/10 text-warning"
                                      : "bg-muted text-foreground",
                                )}
                              >
                                {(lowStock || outOfStock) && (
                                  <AlertCircle className="w-3.5 h-3.5" />
                                )}
                                {variant.stock}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setStockAdjust({
                                        variant,
                                        productName: product.name,
                                        type: "add",
                                      })
                                    }
                                    className="text-sm py-2"
                                  >
                                    <PackagePlus className="w-4 h-4 mr-2" />
                                    Tambah Stok
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setStockAdjust({
                                        variant,
                                        productName: product.name,
                                        type: "subtract",
                                      })
                                    }
                                    className="text-sm py-2"
                                  >
                                    <PackageMinus className="w-4 h-4 mr-2" />
                                    Kurangi Stok
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
        product={editingProduct}
        existingVariants={
          editingProduct
            ? variants.filter((v) => v.productId === editingProduct.id)
            : []
        }
        existingProducts={products}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Produk?"
        description={`Anda yakin ingin menghapus ${deleteTarget?.name} beserta semua variannya? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteProduct}
      />

      <AlertDialog
        open={!!stockAdjust}
        onOpenChange={() => {
          setStockAdjust(null);
          setStockAmount("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {stockAdjust?.type === "add" ? "Tambah" : "Kurangi"} Stok
            </AlertDialogTitle>
            <AlertDialogDescription>
              {stockAdjust?.productName} — {stockAdjust?.variant.name} · Stok
              saat ini: {stockAdjust?.variant.stock}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Masukkan jumlah"
              value={stockAmount}
              onChange={(e) => setStockAmount(e.target.value)}
              min="1"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStockAmount("")}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStockAdjust}
              disabled={!stockAmount || parseInt(stockAmount) <= 0}
            >
              Simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />
    </div>
  );
}

