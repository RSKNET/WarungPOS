import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Percent,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog, ConfirmActionDialog } from "@/components";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { MarkupRule, MarkupType } from "@/types/markup";
import {
  getMarkupRules,
  addMarkupRule,
  updateMarkupRule,
  deleteMarkupRule,
  calculateSellingPrices,
} from "@/database/markup";
import { getProducts, getVariants, updateVariant, waitForProducts, waitForVariants } from "@/database";
import { getCategories, Category } from "@/database/categories";
import { formatCurrency, roundToThousand } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compareAlpha } from "@/lib/sorting";

import { RuleDialog, BatchDialog } from "./components";
import { TierInput } from "./types";

export function PricingPage() {
  const [rules, setRules] = useState<MarkupRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingRule, setEditingRule] = useState<MarkupRule | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [markupType, setMarkupType] = useState<MarkupType>("percent");
  const [retailMarkup, setRetailMarkup] = useState("");
  const [wholesaleMarkup, setWholesaleMarkup] = useState("");
  const [retailMarkupFixed, setRetailMarkupFixed] = useState("");
  const [wholesaleMarkupFixed, setWholesaleMarkupFixed] = useState("");
  const [noMaxLimit, setNoMaxLimit] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const [batchCategoryId, setBatchCategoryId] = useState<string>("all");
  const [batchMarkupType, setBatchMarkupType] = useState<MarkupType>("percent");
  const [tiers, setTiers] = useState<TierInput[]>([]);

  useEffect(() => {
    loadRules();
    setCategories(getCategories());
  }, []);

  const loadRules = () => {
    setRules(getMarkupRules());
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "Semua Produk";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Kategori tidak ditemukan";
  };

  const groupedRules = useMemo(() => {
    const groups: {
      [key: string]: {
        categoryId: string | null;
        categoryName: string;
        rules: MarkupRule[];
      };
    } = {};

    const generalRules = rules
      .filter((r) => r.categoryId === null)
      .sort((a, b) => a.minPrice - b.minPrice);
    if (generalRules.length > 0) {
      groups["__all__"] = {
        categoryId: null,
        categoryName: "Semua Produk",
        rules: generalRules,
      };
    }

    for (const rule of rules) {
      if (rule.categoryId) {
        if (!groups[rule.categoryId]) {
          groups[rule.categoryId] = {
            categoryId: rule.categoryId,
            categoryName: getCategoryName(rule.categoryId),
            rules: [],
          };
        }
        groups[rule.categoryId].rules.push(rule);
      }
    }

    for (const key in groups) {
      groups[key].rules.sort((a, b) => a.minPrice - b.minPrice);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "__all__") return -1;
      if (b === "__all__") return 1;
      return compareAlpha(groups[a].categoryName, groups[b].categoryName);
    });
    const sorted: typeof groups = {};
    for (const key of sortedKeys) sorted[key] = groups[key];
    return sorted;
  }, [rules, categories]);

  const categoriesWithoutRules = useMemo(() => {
    const categoriesWithRules = new Set(
      rules.filter((r) => r.categoryId).map((r) => r.categoryId),
    );
    return categories.filter((c) => !categoriesWithRules.has(c.id));
  }, [categories, rules]);

  const getNextMinPrice = (categoryId: string | null): number => {
    const catKey = categoryId || "__all__";
    const categoryRules = groupedRules[catKey]?.rules || [];

    if (categoryRules.length === 0) {
      return 0;
    }

    const lastRule = categoryRules[categoryRules.length - 1];
    if (lastRule.maxPrice === null) {
      return lastRule.minPrice + 100000;
    }
    return lastRule.maxPrice + 1;
  };

  const resetForm = () => {
    setMinPrice("");
    setMaxPrice("");
    setMarkupType("percent");
    setRetailMarkup("");
    setWholesaleMarkup("");
    setRetailMarkupFixed("");
    setWholesaleMarkupFixed("");
    setNoMaxLimit(false);
    setSelectedCategoryId("all");
    setEditingRule(null);
  };

  const handleOpenDialog = (rule?: MarkupRule, categoryId?: string | null) => {
    if (rule) {
      setEditingRule(rule);
      setMinPrice(rule.minPrice.toString());
      setMaxPrice(rule.maxPrice?.toString() || "");
      setMarkupType(rule.markupType || "percent");
      setRetailMarkup(rule.retailMarkupPercent.toString());
      setWholesaleMarkup(rule.wholesaleMarkupPercent.toString());
      setRetailMarkupFixed((rule.retailMarkupFixed || 0).toString());
      setWholesaleMarkupFixed((rule.wholesaleMarkupFixed || 0).toString());
      setNoMaxLimit(rule.maxPrice === null);
      setSelectedCategoryId(rule.categoryId || "all");
    } else {
      resetForm();
      if (categoryId !== undefined) {
        setSelectedCategoryId(categoryId || "all");
      }
      const catId = categoryId !== undefined ? categoryId : null;
      const nextMin = getNextMinPrice(catId);
      setMinPrice(nextMin.toString());
    }
    setDialogOpen(true);
  };

  const handleOpenBatchDialog = (categoryId?: string | null) => {
    setBatchCategoryId(categoryId || "all");
    setBatchMarkupType("percent");

    const initialTiers: TierInput[] = [
      {
        id: crypto.randomUUID(),
        minPrice: "0",
        maxPrice: "50000",
        noMaxLimit: false,
        retailMarkup: "",
        wholesaleMarkup: "",
        retailMarkupFixed: "",
        wholesaleMarkupFixed: "",
      },
      {
        id: crypto.randomUUID(),
        minPrice: "50001",
        maxPrice: "100000",
        noMaxLimit: false,
        retailMarkup: "",
        wholesaleMarkup: "",
        retailMarkupFixed: "",
        wholesaleMarkupFixed: "",
      },
      {
        id: crypto.randomUUID(),
        minPrice: "100001",
        maxPrice: "",
        noMaxLimit: true,
        retailMarkup: "",
        wholesaleMarkup: "",
        retailMarkupFixed: "",
        wholesaleMarkupFixed: "",
      },
    ];
    setTiers(initialTiers);
    setBatchDialogOpen(true);
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    let nextMin = "0";

    if (lastTier) {
      if (lastTier.noMaxLimit) {
        toast.error(
          'Hapus batas "tidak terbatas" pada tier terakhir untuk menambah tier baru',
        );
        return;
      }
      const lastMax = parseInt(lastTier.maxPrice) || 0;
      nextMin = (lastMax + 1).toString();
    }

    setTiers([
      ...tiers,
      {
        id: crypto.randomUUID(),
        minPrice: nextMin,
        maxPrice: "",
        noMaxLimit: true,
        retailMarkup: "",
        wholesaleMarkup: "",
        retailMarkupFixed: "",
        wholesaleMarkupFixed: "",
      },
    ]);
  };

  const removeTier = (id: string) => {
    if (tiers.length <= 1) {
      toast.error("Minimal harus ada 1 tier");
      return;
    }
    setTiers(tiers.filter((t) => t.id !== id));
  };

  const updateTier = (
    id: string,
    field: keyof TierInput,
    value: string | boolean,
  ) => {
    setTiers(
      tiers.map((t) => {
        if (t.id !== id) return t;

        const updated = { ...t, [field]: value };

        if (field === "maxPrice" && typeof value === "string") {
          const tierIndex = tiers.findIndex((tier) => tier.id === id);
          if (tierIndex < tiers.length - 1 && value) {
            const nextMin = (parseInt(value) || 0) + 1;
            setTimeout(() => {
              setTiers((prev) =>
                prev.map((tier, idx) => {
                  if (idx === tierIndex + 1) {
                    return { ...tier, minPrice: nextMin.toString() };
                  }
                  return tier;
                }),
              );
            }, 0);
          }
        }

        if (field === "noMaxLimit" && value === true) {
          updated.maxPrice = "";
        }

        return updated;
      }),
    );
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const min = parseInt(tier.minPrice) || 0;
      const max = tier.noMaxLimit ? null : parseInt(tier.maxPrice) || null;

      if (min < 0) {
        toast.error(`Tier ${i + 1}: Harga minimum tidak boleh negatif`);
        return;
      }
      if (max !== null && max <= min) {
        toast.error(
          `Tier ${i + 1}: Harga maksimum harus lebih besar dari minimum`,
        );
        return;
      }

      if (batchMarkupType === "percent") {
        const retail = parseFloat(tier.retailMarkup) || 0;
        const wholesale = parseFloat(tier.wholesaleMarkup) || 0;
        if (retail < 0 || wholesale < 0) {
          toast.error(`Tier ${i + 1}: Persentase markup tidak boleh negatif`);
          return;
        }
      } else {
        const retailFixed = parseInt(tier.retailMarkupFixed) || 0;
        const wholesaleFixed = parseInt(tier.wholesaleMarkupFixed) || 0;
        if (retailFixed < 0 || wholesaleFixed < 0) {
          toast.error(`Tier ${i + 1}: Markup rupiah tidak boleh negatif`);
          return;
        }
      }
    }

    const categoryId = batchCategoryId === "all" ? null : batchCategoryId;

    for (const tier of tiers) {
      const min = parseInt(tier.minPrice) || 0;
      const max = tier.noMaxLimit ? null : parseInt(tier.maxPrice) || null;

      addMarkupRule({
        minPrice: min,
        maxPrice: max,
        markupType: batchMarkupType,
        retailMarkupPercent: parseFloat(tier.retailMarkup) || 0,
        wholesaleMarkupPercent: parseFloat(tier.wholesaleMarkup) || 0,
        retailMarkupFixed: parseInt(tier.retailMarkupFixed) || 0,
        wholesaleMarkupFixed: parseInt(tier.wholesaleMarkupFixed) || 0,
        categoryId,
      });
    }

    toast.success(`Berhasil menambahkan ${tiers.length} aturan markup`);
    loadRules();
    setBatchDialogOpen(false);

    setExpandedCategory(categoryId || "__all__");
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const min = parseInt(minPrice) || 0;
    const max = noMaxLimit ? null : parseInt(maxPrice) || null;
    const retail = parseFloat(retailMarkup) || 0;
    const wholesale = parseFloat(wholesaleMarkup) || 0;
    const retailFixed = parseInt(retailMarkupFixed) || 0;
    const wholesaleFixed = parseInt(wholesaleMarkupFixed) || 0;

    if (min < 0) {
      toast.error("Harga minimum tidak boleh negatif");
      return;
    }
    if (max !== null && max <= min) {
      toast.error("Harga maksimum harus lebih besar dari harga minimum");
      return;
    }
    if (markupType === "percent" && (retail < 0 || wholesale < 0)) {
      toast.error("Persentase markup tidak boleh negatif");
      return;
    }
    if (markupType === "fixed" && (retailFixed < 0 || wholesaleFixed < 0)) {
      toast.error("Markup rupiah tidak boleh negatif");
      return;
    }

    const data = {
      minPrice: min,
      maxPrice: max,
      markupType,
      retailMarkupPercent: retail,
      wholesaleMarkupPercent: wholesale,
      retailMarkupFixed: retailFixed,
      wholesaleMarkupFixed: wholesaleFixed,
      categoryId: selectedCategoryId === "all" ? null : selectedCategoryId,
    };

    if (editingRule) {
      updateMarkupRule(editingRule.id, data);
      toast.success("Aturan markup berhasil diperbarui");
    } else {
      addMarkupRule(data);
      toast.success("Aturan markup berhasil ditambahkan");
    }

    loadRules();
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (deletingRuleId) {
      deleteMarkupRule(deletingRuleId);
      toast.success("Aturan markup berhasil dihapus");
      loadRules();
    }
    setDeleteDialogOpen(false);
    setDeletingRuleId(null);
  };

  const confirmDelete = (id: string) => {
    setDeletingRuleId(id);
    setDeleteDialogOpen(true);
  };

  const handleBulkUpdate = async () => {
    setIsUpdating(true);
    try {
      await Promise.all([waitForProducts(), waitForVariants()]);
      const products = getProducts();
      const variants = getVariants();
      const allCategories = getCategories();
      let updatedCount = 0;
      let skippedCount = 0;

      for (const variant of variants) {
        if (variant.costPrice > 0) {
          const product = products.find((p) => p.id === variant.productId);
          const category = allCategories.find(
            (c) => c.name === product?.category,
          );
          const categoryId = category?.id || null;

          const prices = calculateSellingPrices(variant.costPrice, categoryId);
          if (prices) {
            updateVariant(variant.id, {
              retailPrice: prices.retailPrice,
              wholesalePrice: prices.wholesalePrice,
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      if (updatedCount > 0) {
        toast.success(`Berhasil update harga ${updatedCount} produk`);
      }
      if (skippedCount > 0) {
        toast.info(
          `${skippedCount} produk dilewati (tidak ada harga modal atau aturan markup)`,
        );
      }
    } catch (error) {
      toast.error("Gagal update harga massal");
    } finally {
      setIsUpdating(false);
      setBulkUpdateDialogOpen(false);
    }
  };

  const formatPriceRange = (min: number, max: number | null) => {
    if (max === null) {
      return `${formatCurrency(min)} ke atas`;
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  const formatMarkupDisplay = (rule: MarkupRule) => {
    if (rule.markupType === "fixed") {
      return {
        retail: formatCurrency(rule.retailMarkupFixed || 0),
        wholesale: formatCurrency(rule.wholesaleMarkupFixed || 0),
        isFixed: true,
      };
    }
    return {
      retail: `+${rule.retailMarkupPercent}%`,
      wholesale: `+${rule.wholesaleMarkupPercent}%`,
      isFixed: false,
    };
  };

  const calculatePreview = () => {
    const costPrice = parseInt(minPrice) || 0;
    if (costPrice === 0) return null;

    if (markupType === "fixed") {
      const retailFixed = parseInt(retailMarkupFixed) || 0;
      const wholesaleFixed = parseInt(wholesaleMarkupFixed) || 0;
      return {
        retail: roundToThousand(costPrice + retailFixed),
        wholesale: roundToThousand(costPrice + wholesaleFixed),
      };
    }

    const retail = parseFloat(retailMarkup) || 0;
    const wholesale = parseFloat(wholesaleMarkup) || 0;
    return {
      retail: roundToThousand(costPrice * (1 + retail / 100)),
      wholesale: roundToThousand(costPrice * (1 + wholesale / 100)),
    };
  };

  const preview = calculatePreview();

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 py-2.5 px-3.5 rounded-lg border border-border/60 bg-muted/20 flex-1">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs sm:text-sm text-muted-foreground leading-normal">
            Pilih kategori untuk mengatur aturan markup.{" "}
            <strong className="text-foreground font-semibold">Aturan per kategori memiliki prioritas lebih tinggi</strong>{" "}
            dari aturan "Semua Produk".
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setBulkUpdateDialogOpen(true)}
          className="gap-2 h-10 px-4 text-sm font-medium shrink-0"
          disabled={rules.length === 0}
        >
          <RefreshCw className="w-4 h-4" />
          Update Harga Massal
        </Button>
      </div>

      {(categoriesWithoutRules.length > 0 || !groupedRules["__all__"]) && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Tambah Aturan Markup Baru
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pilih kategori di bawah untuk membuat aturan markup
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {!groupedRules["__all__"] && (
              <button
                type="button"
                onClick={() => handleOpenBatchDialog(null)}
                className="p-3.5 rounded-lg border border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-colors text-center group"
              >
                <Layers className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="font-semibold text-sm">Semua Produk</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aturan default
                </p>
              </button>
            )}

            {categoriesWithoutRules.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleOpenBatchDialog(cat.id)}
                className="p-3.5 rounded-lg border border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-colors text-center group"
              >
                <Percent className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="font-semibold text-sm truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Belum ada aturan
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {Object.keys(groupedRules).length === 0 &&
        categoriesWithoutRules.length === 0 &&
        !categories.length && (
          <div className="py-12 text-center text-muted-foreground">
            <Percent className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-sm">Belum ada kategori produk</p>
            <p className="text-xs mt-1">
              Buat kategori terlebih dahulu di menu Produk
            </p>
          </div>
        )}

      {Object.keys(groupedRules).length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daftar Aturan Markup</h3>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {Object.keys(groupedRules).length} kategori aktif
            </span>
          </div>

          <div className="divide-y divide-border/30 border-y border-border/40">
            {Object.entries(groupedRules).map(([key, group]) => (
              <Collapsible
                key={key}
                open={expandedCategory === key}
                onOpenChange={(open) => setExpandedCategory(open ? key : null)}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-muted/30 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        expandedCategory === key && "rotate-90",
                      )}
                    />
                    <Badge
                      variant={group.categoryId ? "default" : "secondary"}
                      className="text-xs font-semibold px-2.5 py-0.5"
                    >
                      {group.categoryName}
                    </Badge>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {group.rules.length} aturan
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1 pb-4 pl-7 pr-1">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 hover:bg-transparent">
                          <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rentang Harga Modal</TableHead>
                          <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipe</TableHead>
                          <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Markup Satuan
                          </TableHead>
                          <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Markup Grosir
                          </TableHead>
                          <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rules.map((rule) => {
                          const markup = formatMarkupDisplay(rule);
                          return (
                            <TableRow key={rule.id} className="border-b border-border/20 text-sm hover:bg-muted/20">
                              <TableCell className="font-medium py-3.5 text-sm">
                                {formatPriceRange(
                                  rule.minPrice,
                                  rule.maxPrice,
                                )}
                              </TableCell>
                              <TableCell className="text-center py-3.5">
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                  {rule.markupType === "fixed"
                                    ? "Rupiah"
                                    : "Persen"}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold tabular-nums ${
                                    markup.isFixed
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {markup.isFixed ? "+" : ""}
                                  {markup.retail}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold tabular-nums ${
                                    markup.isFixed
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "bg-muted text-foreground"
                                  }`}
                                >
                                  {markup.isFixed ? "+" : ""}
                                  {markup.wholesale}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-3.5">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleOpenDialog(rule)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => confirmDelete(rule.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleOpenDialog(undefined, group.categoryId)
                      }
                      className="gap-1.5 h-9 px-3 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Aturan
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRule={editingRule}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        noMaxLimit={noMaxLimit}
        setNoMaxLimit={setNoMaxLimit}
        markupType={markupType}
        setMarkupType={setMarkupType}
        retailMarkup={retailMarkup}
        setRetailMarkup={setRetailMarkup}
        wholesaleMarkup={wholesaleMarkup}
        setWholesaleMarkup={setWholesaleMarkup}
        retailMarkupFixed={retailMarkupFixed}
        setRetailMarkupFixed={setRetailMarkupFixed}
        wholesaleMarkupFixed={wholesaleMarkupFixed}
        setWholesaleMarkupFixed={setWholesaleMarkupFixed}
        preview={preview}
        onSubmit={handleSubmit}
        onClose={handleCloseDialog}
      />

      <BatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        categories={categories}
        batchCategoryId={batchCategoryId}
        setBatchCategoryId={setBatchCategoryId}
        batchMarkupType={batchMarkupType}
        setBatchMarkupType={setBatchMarkupType}
        tiers={tiers}
        addTier={addTier}
        updateTier={updateTier}
        removeTier={removeTier}
        onSubmit={handleBatchSubmit}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Aturan Markup?"
        description="Aturan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
      />

      <ConfirmActionDialog
        open={bulkUpdateDialogOpen}
        onOpenChange={setBulkUpdateDialogOpen}
        title="Update Harga Jual Massal?"
        description={
          <div>
            Semua produk yang memiliki harga modal akan diupdate harga jualnya
            berdasarkan aturan markup yang berlaku.
            <br />
            <br />
            <strong>Catatan:</strong> Harga jual yang sudah ada akan ditimpa
            dengan perhitungan baru.
          </div>
        }
        confirmText="Update Semua"
        loadingText="Memproses..."
        isLoading={isUpdating}
        onConfirm={handleBulkUpdate}
      />
    </div>
  );
}

