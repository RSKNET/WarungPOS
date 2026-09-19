import { useState, useMemo } from "react";
import { Search, CreditCard, ChevronLeft, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  getPartners,
  getPartnerBalance,
  getPartnerLedger,
  addPartnerPayment,
  deletePartnerPayment,
  LedgerEntry,
} from "@/database/partners";
import { Partner } from "@/types/partner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function LedgerPage() {
  const { toast } = useToast();
  const [partners] = useState<Partner[]>(() => getPartners());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"withdraw" | "pay_debt">("pay_debt");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);

  const selectedPartner = useMemo(() => {
    return partners.find((p) => p.id === selectedPartnerId);
  }, [partners, selectedPartnerId]);

  const partnersWithBalances = useMemo(() => {
    return partners.map((p) => {
      const summary = getPartnerBalance(p.id);
      return {
        ...p,
        ...summary,
      };
    });
  }, [partners, refreshKey]);

  const filteredPartners = useMemo(() => {
    return partnersWithBalances.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [partnersWithBalances, searchQuery]);

  const ledgerEntries = useMemo(() => {
    if (!selectedPartnerId) return [];
    return getPartnerLedger(selectedPartnerId);
  }, [selectedPartnerId, refreshKey]);

  const selectedSummary = useMemo(() => {
    if (!selectedPartnerId) return null;
    return getPartnerBalance(selectedPartnerId);
  }, [selectedPartnerId, refreshKey]);

  const handleOpenPayment = (type: "withdraw" | "pay_debt") => {
    setPaymentType(type);
    setFormAmount("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedPartnerId) return;

    const amount = parseFloat(formAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Nominal uang harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "withdraw" && selectedSummary) {
      if (selectedSummary.balance < amount) {
        toast({
          title: "Peringatan",
          description: "Saldo tabungan/deposit tidak mencukupi untuk ditarik",
          variant: "destructive",
        });
        return;
      }
    }

    addPartnerPayment({
      partnerId: selectedPartnerId,
      date: formDate,
      type: paymentType,
      amount,
    });

    toast({
      title: "Berhasil",
      description: paymentType === "pay_debt" ? "Setoran tunai berhasil dicatat" : "Penarikan tunai berhasil dicatat",
    });

    setRefreshKey((prev) => prev + 1);
    setPaymentDialogOpen(false);
  };

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;

    let success = false;
    if (entryToDelete.type === "payment") {
      success = deletePartnerPayment(entryToDelete.id);
    } else {
      toast({
        title: "Peringatan",
        description: "Silakan hapus transaksi ini di halaman asalnya (Setoran Barang atau Ambil Barang)",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      return;
    }

    if (success) {
      toast({ title: "Berhasil", description: "Transaksi berhasil dihapus dari buku rekap" });
      setRefreshKey((prev) => prev + 1);
    } else {
      toast({ title: "Error", description: "Gagal menghapus transaksi", variant: "destructive" });
    }

    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  return (
    <div className="space-y-6 w-full">

      {selectedPartner ? (

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-3 border-b border-border/40">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPartnerId(null)}
                className="h-10 px-3 text-sm gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
              <span className="text-muted-foreground">/</span>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Buku: {selectedPartner.name}</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold font-mono ${
                  (selectedSummary?.balance || 0) >= 0
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {(selectedSummary?.balance || 0) >= 0 ? "Tabungan: +" : "Hutang: -"}
                {formatCurrency(Math.abs(selectedSummary?.balance || 0))}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => handleOpenPayment("pay_debt")}
                className="flex-1 sm:flex-initial h-10 text-sm px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <ArrowDownRight className="h-4 w-4" />
                Setor Tunai
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOpenPayment("withdraw")}
                className="flex-1 sm:flex-initial h-10 text-sm px-4 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 font-medium"
                disabled={(selectedSummary?.balance || 0) <= 0}
              >
                <ArrowUpRight className="h-4 w-4" />
                Tarik Tunai
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-b border-border/40 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Setoran:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(selectedSummary?.totalIncomingLedger || 0)}
              </span>
            </div>
            <span className="text-border hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Pengambilan:</span>
              <span className="font-bold font-mono text-destructive">
                -{formatCurrency(selectedSummary?.totalOutgoing || 0)}
              </span>
            </div>
            <span className="text-border hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Posisi Saldo:</span>
              <span className={`font-bold font-mono ${(selectedSummary?.balance || 0) >= 0 ? "text-primary" : "text-amber-500"}`}>
                {(selectedSummary?.balance || 0) >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(selectedSummary?.balance || 0))}
                {" "}
                ({(selectedSummary?.balance || 0) >= 0 ? "Tabungan" : "Hutang"})
              </span>
            </div>
          </div>

          <div className="space-y-3 w-full pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Riwayat Mutasi Transaksi
              </h3>
              <span className="text-xs text-muted-foreground">{ledgerEntries.length} transaksi</span>
            </div>
            {ledgerEntries.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Belum ada riwayat transaksi pada buku rekap</p>
            ) : (
              <div>
                <div className="hidden sm:block overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="text-left py-3 px-3">Tanggal</th>
                        <th className="text-left py-3 px-3">Keterangan</th>
                        <th className="text-right py-3 px-3 text-destructive">Debet (-)</th>
                        <th className="text-right py-3 px-3 text-emerald-500">Kredit (+)</th>
                        <th className="text-center py-3 px-3 w-12">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-3 text-muted-foreground text-xs font-mono">
                            {format(new Date(entry.date), "dd MMM yyyy", { locale: localeId })}
                          </td>
                          <td className="py-3.5 px-3 font-medium">
                            {entry.description}
                          </td>
                          <td className="py-3.5 px-3 text-right text-destructive font-mono font-semibold">
                            {entry.debit > 0 ? `-${formatCurrency(entry.debit)}` : "-"}
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {entry.credit > 0 ? `+${formatCurrency(entry.credit)}` : "-"}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {entry.type === "payment" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setEntryToDelete(entry);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Hapus transaksi"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground" title="Hapus di menu asalnya">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden divide-y divide-border/30 w-full">
                  {ledgerEntries.map((entry) => (
                    <div key={entry.id} className="py-3 px-1 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {entry.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {format(new Date(entry.date), "dd/MM/yy", { locale: localeId })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        {entry.debit > 0 && (
                          <span className="font-bold text-sm text-destructive font-mono">
                            -{formatCurrency(entry.debit)}
                          </span>
                        )}
                        {entry.credit > 0 && (
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                            +{formatCurrency(entry.credit)}
                          </span>
                        )}
                        {entry.type === "payment" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setEntryToDelete(entry);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="w-8 text-center text-xs text-muted-foreground/40">-</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (

        <div className="space-y-6 w-full">
          <div className="flex items-center gap-2.5 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama mitra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Rekap Saldo Mitra Pengepul
              </h3>
              <span className="text-xs text-muted-foreground">{filteredPartners.length} mitra</span>
            </div>
            {filteredPartners.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Belum ada data mitra / hasil pencarian kosong</p>
            ) : (
              <div>
                <div className="hidden sm:block overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="text-left py-3 px-3">Nama Mitra</th>
                        <th className="text-right py-3 px-3">Setoran Saldo (+)</th>
                        <th className="text-right py-3 px-3">Pengambilan (-)</th>
                        <th className="text-right py-3 px-3">Status / Saldo Akhir</th>
                        <th className="text-center py-3 px-3 w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredPartners.map((p) => {
                        const isPositive = p.balance >= 0;
                        return (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3.5 px-3 font-semibold text-foreground">{p.name}</td>
                            <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              {formatCurrency(p.totalIncomingLedger + p.totalPaidDebt)}
                            </td>
                            <td className="py-3.5 px-3 text-right text-destructive font-mono font-medium">
                              -{formatCurrency(p.totalOutgoing + p.totalWithdrawn)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold font-mono">
                              <span className={isPositive ? "text-primary" : "text-amber-500"}>
                                {isPositive
                                  ? `Tabungan: +${formatCurrency(p.balance)}`
                                  : `Hutang: -${formatCurrency(Math.abs(p.balance))}`}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs font-medium"
                                onClick={() => setSelectedPartnerId(p.id)}
                              >
                                Buka Buku
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden divide-y divide-border/30 w-full">
                  {filteredPartners.map((p) => {
                    const isPositive = p.balance >= 0;
                    return (
                      <div key={p.id} className="py-3.5 px-1 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-foreground truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5 text-xs mt-1 font-mono font-semibold">
                            <span className={isPositive ? "text-primary" : "text-amber-500"}>
                              {isPositive
                                ? `Tabungan: +${formatCurrency(p.balance)}`
                                : `Hutang: -${formatCurrency(Math.abs(p.balance))}`}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs shrink-0 font-medium"
                          onClick={() => setSelectedPartnerId(p.id)}
                        >
                          Buka Buku
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {paymentType === "pay_debt" ? "Setor Tunai (Bayar Hutang)" : "Tarik Tunai Tabungan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedPartner && (
              <div className="space-y-2 py-2 border-b border-border/40 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mitra:</span>
                  <span className="font-bold text-foreground">{selectedPartner.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Posisi Saldo:</span>
                  <span className={`font-bold font-mono ${(selectedSummary?.balance || 0) >= 0 ? "text-primary" : "text-amber-500"}`}>
                    {(selectedSummary?.balance || 0) >= 0
                      ? `+${formatCurrency(selectedSummary?.balance || 0)}`
                      : `-${formatCurrency(Math.abs(selectedSummary?.balance || 0))}`}
                    {" "}
                    ({(selectedSummary?.balance || 0) >= 0 ? "Tabungan" : "Hutang"})
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tanggal Transaksi *</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Uang *</Label>
              <PriceInput
                value={formAmount}
                onChange={setFormAmount}
                placeholder="0"
                className="h-10 text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 h-10 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handlePaymentSubmit}
            >
              Simpan Transaksi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Transaksi Kas?"
        description="Apakah Anda yakin ingin menghapus catatan transaksi ini dari buku rekap? Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi saldo mitra."
        onConfirm={handleDeleteEntry}
      />
    </div>
  );
}

