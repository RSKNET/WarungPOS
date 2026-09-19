import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Calendar, Filter, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getPartners,
  getIncoming,
  addIncoming,
  deleteIncoming,
} from "@/database/partners";
import { Partner, PartnerIncoming } from "@/types/partner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function IncomingPage() {
  const { toast } = useToast();
  const [partners] = useState<Partner[]>(() => getPartners());
  const [incomingList, setIncomingList] = useState<PartnerIncoming[]>(() => getIncoming());
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [incomingToDelete, setIncomingToDelete] = useState<PartnerIncoming | null>(null);

  const [formPartnerId, setFormPartnerId] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formProduct, setFormProduct] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formPrice, setFormPrice] = useState("");
  const [formMethod, setFormMethod] = useState<PartnerIncoming["paymentMethod"]>("offset_ledger");

  const computedTotal = useMemo(() => {
    const qty = parseFloat(formQuantity) || 0;
    const price = parseFloat(formPrice) || 0;
    return qty * price;
  }, [formQuantity, formPrice]);

  const filteredIncoming = useMemo(() => {
    return incomingList.filter((x) => {
      const matchesSearch =
        x.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        x.productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPartner = filterPartner === "all" || x.partnerId === filterPartner;
      const matchesMethod = filterMethod === "all" || x.paymentMethod === filterMethod;
      return matchesSearch && matchesPartner && matchesMethod;
    });
  }, [incomingList, searchQuery, filterPartner, filterMethod]);

  const groupedIncoming = useMemo(() => {
    const grouped: Record<
      string,
      {
        partnerName: string;
        items: PartnerIncoming[];
        total: number;
      }
    > = {};

    filteredIncoming.forEach((item) => {
      if (!grouped[item.partnerId]) {
        grouped[item.partnerId] = {
          partnerName: item.partnerName,
          items: [],
          total: 0,
        };
      }
      grouped[item.partnerId].items.push(item);
      grouped[item.partnerId].total += item.totalValue;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.partnerName.localeCompare(b.partnerName))
      .map(([partnerId, data]) => ({
        partnerId,
        ...data,
      }));
  }, [filteredIncoming]);

  const refreshIncoming = () => {
    setIncomingList(getIncoming());
  };

  const resetForm = () => {
    setFormPartnerId("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormProduct("");
    setFormQuantity("");
    setFormUnit("kg");
    setFormPrice("");
    setFormMethod("offset_ledger");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const partner = partners.find((p) => p.id === formPartnerId);
    if (!partner) {
      toast({
        title: "Error",
        description: "Pilih mitra terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formProduct.trim()) {
      toast({
        title: "Error",
        description: "Nama produk/hasil bumi harus diisi",
        variant: "destructive",
      });
      return;
    }

    const qty = parseFloat(formQuantity) || 0;
    if (qty <= 0) {
      toast({
        title: "Error",
        description: "Jumlah barang harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formPrice) || 0;
    if (price <= 0) {
      toast({
        title: "Error",
        description: "Harga satuan harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    addIncoming({
      partnerId: partner.id,
      date: formDate,
      productName: formProduct.trim(),
      quantity: qty,
      unit: formUnit.trim(),
      pricePerUnit: price,
      totalValue: qty * price,
      paymentMethod: formMethod,
    });

    toast({ title: "Berhasil", description: "Setoran barang masuk berhasil dicatat" });
    setDialogOpen(false);
    resetForm();
    refreshIncoming();
  };

  const handleDelete = () => {
    if (!incomingToDelete) return;
    deleteIncoming(incomingToDelete.id);
    toast({ title: "Berhasil", description: "Riwayat setoran dihapus" });
    setDeleteDialogOpen(false);
    setIncomingToDelete(null);
    refreshIncoming();
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari mitra / barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>
          <Button
            onClick={openAddDialog}
            className="h-10 px-4 text-sm font-medium gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Catat Setoran</span>
            <span className="sm:hidden">Catat</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Semua Mitra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mitra</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-[180px]">
              <SelectValue placeholder="Metode Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Metode</SelectItem>
              <SelectItem value="offset_ledger">Saldo Buku</SelectItem>
              <SelectItem value="cash">Tunai Langsung</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupedIncoming.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery || filterPartner !== "all" || filterMethod !== "all"
              ? "Tidak ada setoran yang cocok"
              : "Belum ada transaksi setoran barang masuk dari mitra"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Catat setoran komoditas atau hasil bumi dari mitra untuk menambah saldo buku
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {groupedIncoming.map((partnerData) => (
            <div key={partnerData.partnerId} className="border-b border-border/40 pb-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
                <h3 className="font-bold text-base text-foreground">
                  {partnerData.partnerName}
                </h3>
                <span className="font-bold text-sm text-primary font-mono">
                  Total: {formatCurrency(partnerData.total)}
                </span>
              </div>

              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-3">Tanggal</th>
                      <th className="text-left py-3 px-3">Produk</th>
                      <th className="text-right py-3 px-3">Jumlah</th>
                      <th className="text-right py-3 px-3">Harga Satuan</th>
                      <th className="text-right py-3 px-3">Total Nilai</th>
                      <th className="text-center py-3 px-3">Metode</th>
                      <th className="text-center py-3 px-3 w-12">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {partnerData.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(item.date), "dd MMM yyyy", { locale: localeId })}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-foreground">
                          {item.productName}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          {formatCurrency(item.pricePerUnit)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-primary">
                          {formatCurrency(item.totalValue)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {item.paymentMethod === "offset_ledger" ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5 font-medium">
                              Saldo Buku
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs px-2 py-0.5 font-medium">
                              Tunai Langsung
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setIncomingToDelete(item);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus setoran"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-border/30 w-full">
                {partnerData.items.map((item) => (
                  <div key={item.id} className="py-3 px-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{item.productName}</span>
                        {item.paymentMethod === "offset_ledger" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0 font-medium shrink-0">
                            Saldo Buku
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] px-1.5 py-0 font-medium shrink-0">
                            Tunai
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <span>{format(new Date(item.date), "dd/MM/yy", { locale: localeId })}</span>
                        <span>•</span>
                        <span>{item.quantity} {item.unit} @ {formatCurrency(item.pricePerUnit)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-bold text-sm text-primary font-mono">{formatCurrency(item.totalValue)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setIncomingToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Catat Setoran Barang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Mitra *</Label>
                <Select value={formPartnerId} onValueChange={setFormPartnerId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Pilih mitra" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tanggal *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Nama Barang *</Label>
                <Input
                  value={formProduct}
                  onChange={(e) => setFormProduct(e.target.value)}
                  placeholder="Padi / Jagung / Kelapa"
                  maxLength={50}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Satuan *</Label>
                <Input
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  placeholder="kg / sak"
                  maxLength={20}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Jumlah (Qty) *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="0"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Harga Satuan *</Label>
                <PriceInput
                  value={formPrice}
                  onChange={setFormPrice}
                  placeholder="0"
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>

            <div className="py-2 flex justify-between items-center text-sm border-y border-border/40">
              <span className="text-muted-foreground font-medium">Total Nilai:</span>
              <span className="font-bold text-base text-primary font-mono">{formatCurrency(computedTotal)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Metode Pembayaran *</Label>
              <Select
                value={formMethod}
                onValueChange={(v) => setFormMethod(v as PartnerIncoming["paymentMethod"])}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offset_ledger">Saldo Buku (Kredit/Potong Hutang)</SelectItem>
                  <SelectItem value="cash">Tunai Langsung (Bayar Cash ke Mitra)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button className="flex-1 h-10 text-sm font-medium" onClick={handleSubmit}>
              Simpan Setoran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Riwayat Setoran?"
        description={
          <>
            Apakah Anda yakin ingin menghapus data setoran{" "}
            <strong className="text-foreground">{incomingToDelete?.productName}</strong> senilai{" "}
            <strong className="text-foreground">{formatCurrency(incomingToDelete?.totalValue || 0)}</strong> untuk{" "}
            <strong className="text-foreground">{incomingToDelete?.partnerName}</strong>? Tindakan ini akan mempengaruhi saldo buku.
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

