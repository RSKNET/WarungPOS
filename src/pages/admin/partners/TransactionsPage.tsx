import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Calendar,
  PackagePlus,
  PackageMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PriceInput } from "@/components/ui/price-input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getPartners,
  getIncoming,
  addIncoming,
  deleteIncoming,
  getOutgoing,
  addOutgoing,
  deleteOutgoing,
} from "@/database/partners";
import { Partner, PartnerIncoming, PartnerOutgoing } from "@/types/partner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function groupPartnerTransactions<
  T extends { partnerId: string; partnerName: string; totalValue: number },
>(items: T[]) {
  const grouped: Record<
    string,
    {
      partnerName: string;
      items: T[];
      total: number;
    }
  > = {};

  items.forEach((item) => {
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
}

interface PartnerTransactionLayoutProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  isSearchDisabled?: boolean;
  filterPartner: string;
  setFilterPartner: (partnerId: string) => void;
  partners: Partner[];
  actionButtonText: string;
  onAddClick: () => void;
  extraFilterSlot?: React.ReactNode;
  isEmpty: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteTitle: string;
  deleteDescription: string;
  onConfirmDelete: () => void;
  children: React.ReactNode;
}

function PartnerTransactionLayout({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Cari mitra...",
  isSearchDisabled = false,
  filterPartner,
  setFilterPartner,
  partners,
  actionButtonText,
  onAddClick,
  extraFilterSlot,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  deleteDialogOpen,
  setDeleteDialogOpen,
  deleteTitle,
  deleteDescription,
  onConfirmDelete,
  children,
}: PartnerTransactionLayoutProps) {
  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>
          <Button
            onClick={onAddClick}
            className="h-10 px-4 text-sm font-medium gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{actionButtonText}</span>
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

          {extraFilterSlot}
        </div>
      </div>

      {isEmpty ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          {emptyIcon}
          <p className="text-base font-medium">{emptyTitle}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">{children}</div>
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

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
    return groupPartnerTransactions(filteredIncoming);
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

  const extraFilter = (
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
  );

  return (
    <>
      <PartnerTransactionLayout
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Cari mitra / barang..."
        isSearchDisabled={isSearchDisabled}
        filterPartner={filterPartner}
        setFilterPartner={setFilterPartner}
        partners={partners}
        actionButtonText="Catat Setoran"
        onAddClick={openAddDialog}
        extraFilterSlot={extraFilter}
        isEmpty={groupedIncoming.length === 0}
        emptyIcon={<PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />}
        emptyTitle={
          searchQuery || filterPartner !== "all" || filterMethod !== "all"
            ? "Tidak ada setoran yang cocok"
            : "Belum ada transaksi setoran barang masuk dari mitra"
        }
        emptyDescription="Catat setoran komoditas atau hasil bumi dari mitra untuk menambah saldo buku"
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteTitle="Hapus Riwayat Setoran?"
        deleteDescription={`Hapus setoran "${incomingToDelete?.productName}" senilai ${formatCurrency(incomingToDelete?.totalValue || 0)}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirmDelete={handleDelete}
      >
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
                        <Badge
                          variant={item.paymentMethod === "offset_ledger" ? "default" : "secondary"}
                          className="text-[11px]"
                        >
                          {item.paymentMethod === "offset_ledger" ? "Saldo Buku" : "Tunai"}
                        </Badge>
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

            <div className="sm:hidden divide-y divide-border/30">
              {partnerData.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {item.productName}
                      </span>
                      <Badge
                        variant={item.paymentMethod === "offset_ledger" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.paymentMethod === "offset_ledger" ? "Buku" : "Tunai"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {item.quantity} {item.unit} @ {formatCurrency(item.pricePerUnit)}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(item.date), "dd/MM/yy")}</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-primary">
                      {formatCurrency(item.totalValue)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0 mt-1"
                    onClick={() => {
                      setIncomingToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </PartnerTransactionLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold">Catat Setoran Barang Masuk</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mitra *</Label>
              <Select value={formPartnerId} onValueChange={setFormPartnerId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih mitra..." />
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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nama Produk / Hasil Bumi *</Label>
              <Input
                placeholder="Contoh: Jagung Pipil, Gabah Kering..."
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Jumlah *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Satuan *</Label>
                <Input
                  placeholder="kg / karung / liter..."
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Harga per Satuan (Rp) *</Label>
              <PriceInput
                value={formPrice}
                onChange={setFormPrice}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>

            {computedTotal > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Nilai:</span>
                <span className="text-base font-bold font-mono text-primary">
                  {formatCurrency(computedTotal)}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Metode Pembayaran *</Label>
              <Select
                value={formMethod}
                onValueChange={(val: PartnerIncoming["paymentMethod"]) => setFormMethod(val)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offset_ledger">
                    Tambah Saldo Buku (Bayar Nanti / Akumulasi)
                  </SelectItem>
                  <SelectItem value="cash">
                    Tunai Langsung (Sudah Dibayar Tunai)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 text-sm font-medium"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 h-10 text-sm font-medium"
              >
                Simpan Setoran
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OutgoingPage() {
  const { toast } = useToast();
  const [partners] = useState<Partner[]>(() => getPartners());
  const [outgoingList, setOutgoingList] = useState<PartnerOutgoing[]>(() => getOutgoing());
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [outgoingToDelete, setOutgoingToDelete] = useState<PartnerOutgoing | null>(null);

  const [formPartnerId, setFormPartnerId] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const filteredOutgoing = useMemo(() => {
    return outgoingList.filter((x) => {
      const matchesSearch =
        x.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        x.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPartner = filterPartner === "all" || x.partnerId === filterPartner;
      return matchesSearch && matchesPartner;
    });
  }, [outgoingList, searchQuery, filterPartner]);

  const groupedOutgoing = useMemo(() => {
    return groupPartnerTransactions(filteredOutgoing);
  }, [filteredOutgoing]);

  const refreshOutgoing = () => {
    setOutgoingList(getOutgoing());
  };

  const resetForm = () => {
    setFormPartnerId("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormDescription("");
    setFormAmount("");
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

    if (!formDescription.trim()) {
      toast({
        title: "Error",
        description: "Deskripsi barang/uang yang diambil harus diisi",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Nominal nilai harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    addOutgoing({
      partnerId: partner.id,
      date: formDate,
      description: formDescription.trim(),
      totalValue: amount,
    });

    toast({ title: "Berhasil", description: "Pengambilan barang/uang berhasil dicatat" });
    setDialogOpen(false);
    resetForm();
    refreshOutgoing();
  };

  const handleDelete = () => {
    if (!outgoingToDelete) return;
    deleteOutgoing(outgoingToDelete.id);
    toast({ title: "Berhasil", description: "Riwayat pengambilan dihapus" });
    setDeleteDialogOpen(false);
    setOutgoingToDelete(null);
    refreshOutgoing();
  };

  return (
    <>
      <PartnerTransactionLayout
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Cari mitra / deskripsi..."
        isSearchDisabled={isSearchDisabled}
        filterPartner={filterPartner}
        setFilterPartner={setFilterPartner}
        partners={partners}
        actionButtonText="Catat Ambil"
        onAddClick={openAddDialog}
        isEmpty={groupedOutgoing.length === 0}
        emptyIcon={<PackageMinus className="w-12 h-12 mx-auto mb-3 opacity-20" />}
        emptyTitle={
          searchQuery || filterPartner !== "all"
            ? "Tidak ada pengambilan yang cocok"
            : "Belum ada transaksi pengambilan barang/uang dari mitra"
        }
        emptyDescription="Catat pengambilan barang (pupuk, bibit, kasbon) untuk memotong saldo buku mitra"
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteTitle="Hapus Riwayat Pengambilan?"
        deleteDescription={`Hapus catatan "${outgoingToDelete?.description}" senilai ${formatCurrency(outgoingToDelete?.totalValue || 0)}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirmDelete={handleDelete}
      >
        {groupedOutgoing.map((partnerData) => (
          <div key={partnerData.partnerId} className="border-b border-border/40 pb-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
              <h3 className="font-bold text-base text-foreground">
                {partnerData.partnerName}
              </h3>
              <span className="font-bold text-sm text-destructive font-mono">
                Total: -{formatCurrency(partnerData.total)}
              </span>
            </div>

            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-3">Tanggal</th>
                    <th className="text-left py-3 px-3">Barang / Deskripsi</th>
                    <th className="text-right py-3 px-3">Total Nilai</th>
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
                        {item.description}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-destructive">
                        -{formatCurrency(item.totalValue)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setOutgoingToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          title="Hapus pengambilan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-border/30">
              {partnerData.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(item.date), "dd/MM/yy")}</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-destructive">
                      -{formatCurrency(item.totalValue)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0 mt-1"
                    onClick={() => {
                      setOutgoingToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </PartnerTransactionLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold">Catat Pengambilan Barang / Uang</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mitra *</Label>
              <Select value={formPartnerId} onValueChange={setFormPartnerId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih mitra..." />
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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deskripsi / Barang yang Diambil *</Label>
              <Input
                placeholder="Contoh: Pupuk NPK 2 sak, Kasbon, Solar..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Nilai (Rp) *</Label>
              <PriceInput
                value={formAmount}
                onChange={setFormAmount}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 text-sm font-medium"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 h-10 text-sm font-medium"
              >
                Simpan Pengambilan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
