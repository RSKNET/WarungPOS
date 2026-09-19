import { useState, useCallback, useEffect } from "react";
import { Product, ProductVariant, ProductFormData } from "@/types/pos";
import { getCategoryNames, getCategories } from "@/database/categories";
import { getMarkupForPrice, calculateSellingPrices } from "@/database/markup";
import { generateSKU, generateSKUWithExisting } from "@/lib/sku";
import { toTitleCase } from "@/lib/text";
import { formatCurrency } from "@/lib/format";
import { SuggestInput, SuggestOption } from "@/components/SuggestInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelect } from "@/components/CategoryManager";
import { UnitSelect } from "@/components/UnitSelect";
import { getUnitNames } from "@/database/units";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calculator, Info, Plus, Trash2, ScanLine, Loader2 } from "lucide-react";

interface VariantRow {

  id?: string;
  name: string;
  sku: string;
  costPriceStr: string;
  retailPriceStr: string;
  wholesalePriceStr: string;
  wholesaleMinQty: string;
  stock: string;
  hasWholesale: boolean;
}

function emptyVariant(category: string, existingSkus: string[] = []): VariantRow {
  return {
    name: "",
    sku: generateSKUWithExisting(category, existingSkus),
    costPriceStr: "",
    retailPriceStr: "",
    wholesalePriceStr: "",
    wholesaleMinQty: "10",
    stock: "0",
    hasWholesale: false,
  };
}

function fromExistingVariant(v: ProductVariant): VariantRow {
  return {
    id: v.id,
    name: v.name,
    sku: v.sku,
    costPriceStr: v.costPrice > 0 ? String(v.costPrice) : "",
    retailPriceStr: v.retailPrice > 0 ? String(v.retailPrice) : "",
    wholesalePriceStr: v.wholesalePrice > 0 ? String(v.wholesalePrice) : "",
    wholesaleMinQty: String(v.wholesaleMinQty || 10),
    stock: String(v.stock || 0),
    hasWholesale: v.wholesalePrice > 0,
  };
}

function toVariantData(row: VariantRow) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    costPrice: parseInt(row.costPriceStr) || 0,
    retailPrice: parseInt(row.retailPriceStr) || 0,
    wholesalePrice: row.hasWholesale ? (parseInt(row.wholesalePriceStr) || 0) : 0,
    wholesaleMinQty: row.hasWholesale ? (parseInt(row.wholesaleMinQty) || 10) : 10,
    stock: parseInt(row.stock) || 0,
  };
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null;
  existingVariants?: ProductVariant[];
  existingProducts?: Product[];
}

export function ProductForm({
  open,
  onClose,
  onSubmit,
  product,
  existingVariants = [],
  existingProducts = [],
}: ProductFormProps) {
  const isEditing = !!product;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [scanTargetIdx, setScanTargetIdx] = useState<number | null>(null);
  const [startingScanIdx, setStartingScanIdx] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>(() => getCategoryNames());
  const [units, setUnits] = useState<string[]>(() => getUnitNames());

  const refreshCategories = useCallback(() => setCategories(getCategoryNames()), []);
  const refreshUnits = useCallback(() => setUnits(getUnitNames()), []);

  const productOptions: SuggestOption[] = isEditing
    ? []
    : existingProducts.map((p) => ({
        id: p.id,
        label: p.name,
        badge: p.category,
        data: p,
      }));

  useEffect(() => {
    if (!open) return;

    if (isEditing && product) {
      setName(product.name);
      setCategory(product.category);
      setVariants(
        existingVariants.length > 0
          ? existingVariants.map(fromExistingVariant)
          : [emptyVariant(product.category)],
      );
    } else {
      setName("");
      setCategory("");
      setVariants([emptyVariant("")]);
    }
  }, [open]);

  const applyMarkup = (idx: number, costStr: string) => {
    const cost = parseInt(costStr) || 0;
    if (cost <= 0 || !category) return;

    const allCategories = getCategories();
    const catData = allCategories.find((c) => c.name === category);
    const categoryId = catData?.id || null;
    const prices = calculateSellingPrices(cost, categoryId);
    if (!prices) return;

    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx
          ? {
              ...v,
              retailPriceStr: String(prices.retailPrice),
              wholesalePriceStr: String(prices.wholesalePrice),
            }
          : v,
      ),
    );
  };

  const updateVariant = (
    idx: number,
    field: keyof VariantRow,
    value: string | boolean,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        const updated = { ...v, [field]: value };
        if (field === "costPriceStr") {
          applyMarkup(idx, value as string);
        }
        return updated;
      }),
    );
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      emptyVariant(category, prev.map((v) => v.sku)),
    ]);
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBarcodeDetected = (sku: string) => {
    if (scanTargetIdx === null) return;
    updateVariant(scanTargetIdx, "sku", sku);
    setScanTargetIdx(null);
  };

  const getMarkupInfo = (row: VariantRow) => {
    const cost = parseInt(row.costPriceStr) || 0;
    if (cost <= 0 || !category) return null;
    const allCategories = getCategories();
    const catData = allCategories.find((c) => c.name === category);
    const markup = getMarkupForPrice(cost, catData?.id || null);
    if (!markup) return null;
    return markup.type === "fixed"
      ? { retail: markup.retailFixed, wholesale: markup.wholesaleFixed, type: "fixed" as const }
      : { retail: markup.retailPercent, wholesale: markup.wholesalePercent, type: "percent" as const };
  };

  const isValid =
    name.trim() &&
    category &&
    variants.some(
      (v) => v.name.trim() && v.sku.trim() && (parseInt(v.retailPriceStr) || 0) > 0,
    );

  const handleSubmit = () => {
    if (!isValid) return;

    const validVariants = variants.filter(
      (v) => v.name.trim() && v.sku.trim() && (parseInt(v.retailPriceStr) || 0) > 0,
    );

    onSubmit({
      name: name.trim(),
      category,
      variants: validVariants.map(toVariantData),
    });
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
              {isEditing ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Info Produk
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nama Produk *</Label>
                  <SuggestInput
                    value={name}
                    options={productOptions}
                    onChange={(val) => setName(toTitleCase(val))}
                    onSelectOption={(opt) => {
                      const p = opt.data as Product;
                      if (p) {
                        setName(p.name);
                        setCategory(p.category);
                      }
                    }}
                    placeholder="Contoh: Indomie Goreng"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kategori</Label>
                  <CategorySelect
                    value={category}
                    categories={categories}
                    onValueChange={(val) => {
                      setCategory(val);
                      if (val) {
                        setVariants((prev) =>
                          prev.map((row) => {
                            if (!row.sku || row.sku.startsWith("PRD")) {
                              return { ...row, sku: generateSKU(val) };
                            }
                            return row;
                          }),
                        );
                      }
                    }}
                    onCategoriesChanged={refreshCategories}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3.5 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Varian & Satuan ({variants.length})
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                  className="gap-1.5 text-xs font-semibold h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Varian
                </Button>
              </div>

              <div className="divide-y divide-border/30">
                {variants.map((row, idx) => {
                  const cost = parseInt(row.costPriceStr) || 0;
                  const retail = parseInt(row.retailPriceStr) || 0;
                  const wholesale = parseInt(row.wholesalePriceStr) || 0;
                  const markupInfo = getMarkupInfo(row);

                  return (
                    <div
                      key={idx}
                      className="py-4 space-y-3.5 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">
                          Varian {idx + 1}
                          {row.name && ` — ${row.name}`}
                        </span>
                        {variants.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeVariant(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Nama Satuan *</Label>
                          <UnitSelect
                            value={row.name}
                            units={units}
                            onValueChange={(val) => updateVariant(idx, "name", val)}
                            onUnitsChanged={refreshUnits}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">SKU / Barcode *</Label>
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Scan atau ketik barcode"
                              value={row.sku}
                              onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                              className="flex-1 text-sm font-mono h-10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0 h-10 w-10"
                              title="Scan Barcode"
                              onClick={() => {
                                setStartingScanIdx(idx);
                                setScanTargetIdx(idx);
                              }}
                              disabled={startingScanIdx !== null}
                            >
                              {startingScanIdx === idx ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : (
                                <ScanLine className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                          Harga Modal (Opsional)
                        </Label>
                        <PriceInput
                          value={row.costPriceStr}
                          onChange={(v) => {
                            updateVariant(idx, "costPriceStr", v);
                            applyMarkup(idx, v);
                          }}
                          placeholder="0"
                        />
                        {markupInfo && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
                            <Info className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                            <span>
                              {markupInfo.type === "fixed"
                                ? `Markup: Eceran +${formatCurrency(markupInfo.retail)}, Grosir +${formatCurrency(markupInfo.wholesale)}`
                                : `Markup: Eceran +${markupInfo.retail}%, Grosir +${markupInfo.wholesale}%`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Harga Jual Satuan *</Label>
                          <PriceInput
                            value={row.retailPriceStr}
                            onChange={(v) => updateVariant(idx, "retailPriceStr", v)}
                            placeholder="0"
                          />
                          {cost > 0 && retail > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Margin: {formatCurrency(retail - cost)}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Stok Awal</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.stock}
                            onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`ws-${idx}`}
                            checked={row.hasWholesale}
                            onCheckedChange={(c) =>
                              updateVariant(idx, "hasWholesale", !!c)
                            }
                          />
                          <Label htmlFor={`ws-${idx}`} className="cursor-pointer text-sm font-medium">
                            Ada harga grosir
                          </Label>
                        </div>

                        {row.hasWholesale && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pl-3.5 border-l-2 border-primary/40 ml-1">
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium">Harga Grosir</Label>
                              <PriceInput
                                value={row.wholesalePriceStr}
                                onChange={(v) => updateVariant(idx, "wholesalePriceStr", v)}
                                placeholder="0"
                              />
                              {cost > 0 && wholesale > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Margin: {formatCurrency(wholesale - cost)}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium">Min. Qty Grosir</Label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="10"
                                value={row.wholesaleMinQty}
                                onChange={(e) =>
                                  updateVariant(idx, "wholesaleMinQty", e.target.value)
                                }
                                className="h-10 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 text-sm font-medium"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button
                className="flex-1 h-10 text-sm font-medium"
                onClick={handleSubmit}
                disabled={!isValid}
              >
                {isEditing ? "Simpan Perubahan" : "Tambah Produk"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scanTargetIdx !== null}
        onReady={() => setStartingScanIdx(null)}
        onClose={() => {
          setStartingScanIdx(null);
          setScanTargetIdx(null);
        }}
        onDetected={handleBarcodeDetected}
        title={
          scanTargetIdx !== null
            ? `Scan SKU Varian ${scanTargetIdx + 1}`
            : "Scan Barcode"
        }
      />
    </>
  );
}

