import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft, Printer, Download, Share2, MoreVertical,
  CalendarIcon, X, User, CreditCard, Trash2, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PriceInput } from "@/components/ui/price-input";
import { ResponsiveActionBar, ActionBarItem } from "@/components/ResponsiveActionBar";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getPartners, getPartnerBalancesMap, getIncoming, getOutgoing, getPartnerPayments,
  getPartnerLedger, addPartnerPayment, deletePartnerPayment, LedgerEntry, PartnerBalanceSummary,
} from "@/database/partners";
import { Partner } from "@/types/partner";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  StatementDocumentOptions, StatementRow, getStoreReceiptInfo,
  printStatementDocument, printMultipleStatementDocuments,
  saveStatementImage, saveMultipleStatementImages,
  shareStatementImage, shareMultipleStatementImages,
} from "@/lib/statement-document";

export type PartnerWithBalance = Partner & PartnerBalanceSummary & { txCount: number };

const parseEntryDate = (d: string) => (d.includes("T") ? new Date(d) : new Date(`${d}T00:00:00`));

const formatBalance = (val: number) => ({
  text: `${val > 0 ? "+" : val < 0 ? "-" : ""}${formatCurrency(Math.abs(val))}`,
  className: val === 0 ? "text-muted-foreground" : val > 0 ? "text-primary" : "text-amber-500",
});

function buildPartnerStatementOptions(
  partner: PartnerWithBalance,
  entries: LedgerEntry[],
  dateRange?: { from?: Date; to?: Date }
): StatementDocumentOptions {
  const store = getStoreReceiptInfo();
  const isSurplus = partner.balance >= 0;
  const isImpas = partner.balance === 0;

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalDebit = sorted.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = sorted.reduce((sum, e) => sum + e.credit, 0);

  const periodeStr = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
    : dateRange?.from
    ? `Dari ${format(dateRange.from, "dd/MM/yyyy")}`
    : dateRange?.to
    ? `Sampai ${format(dateRange.to, "dd/MM/yyyy")}`
    : "Semua Riwayat";

  const rows: StatementRow[] = sorted.map((e, i) => ({
    id: e.id || String(i),
    cells: {
      no: { value: i + 1, style: "color: #6b7280;" },
      date: { value: format(parseEntryDate(e.date), "dd/MM/yyyy", { locale: localeId }), style: "color: #4b5563;" },
      description: { value: e.description, style: "font-weight: 500;" },
      debit: { value: e.debit > 0 ? `- ${formatCurrency(e.debit)}` : "—", style: e.debit > 0 ? "font-weight: 700; color: #e11d48;" : "color: #9ca3af;", isMono: true },
      credit: { value: e.credit > 0 ? `+ ${formatCurrency(e.credit)}` : "—", style: e.credit > 0 ? "font-weight: 700; color: #16a34a;" : "color: #9ca3af;", isMono: true },
    },
  }));

  return {
    store,
    meta: { title: "BUKU REKAP MITRA", date: new Date() },
    party: {
      items: [
        { label: "Nama Mitra", value: partner.name },
        { label: "No. HP", value: partner.phone || "—" },
        { label: "Periode", value: periodeStr },
      ],
      badge: {
        label: "STATUS SALDO",
        value: isImpas ? "IMPAS" : isSurplus ? "TABUNGAN" : "HUTANG",
        color: isImpas ? "#64748b" : isSurplus ? "#16a34a" : "#e11d48",
      },
    },
    columns: [
      { key: "no", header: "NO", align: "center", width: "35px" },
      { key: "date", header: "TANGGAL", width: "100px" },
      { key: "description", header: "KETERANGAN / MUTASI" },
      { key: "debit", header: "DEBET (-)", align: "right", width: "125px", isMono: true },
      { key: "credit", header: "KREDIT (+)", align: "right", width: "125px", isMono: true },
    ],
    rows,
    summaries: [
      { label: "Total Setoran (+)", value: formatCurrency(totalCredit) },
      { label: "Total Pengambilan (-)", value: formatCurrency(totalDebit) },
      {
        label: isImpas ? "Saldo Akhir" : isSurplus ? "Posisi Tabungan Mitra" : "Posisi Hutang Mitra",
        value: `${isImpas ? "" : isSurplus ? "+" : "-"}${formatCurrency(Math.abs(partner.balance))}`,
        isHighlight: true,
      },
    ],
    signatures: [{ title: "Mitra Pengepul", name: partner.name }, { title: "Hormat Kami", name: store.storeName }],
    footerNote: "Dokumen ini dicetak otomatis dari sistem WarungPOS sebagai bukti rekap mutasi saldo mitra yang sah.",
  };
}

export function LedgerPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [partners] = useState<Partner[]>(() => getPartners());
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPartner, setPaymentPartner] = useState<PartnerWithBalance | null>(null);
  const [paymentType, setPaymentType] = useState<"withdraw" | "pay_debt">("pay_debt");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([paymentDialogOpen, deleteDialogOpen]);

  const partnersWithBalances = useMemo<PartnerWithBalance[]>(() => {
    void refreshKey;
    const balanceMap = getPartnerBalancesMap();
    const incoming = getIncoming();
    const outgoing = getOutgoing();
    const payments = getPartnerPayments();

    const txCountMap = new Map<string, number>();
    for (const x of incoming) txCountMap.set(x.partnerId, (txCountMap.get(x.partnerId) || 0) + 1);
    for (const x of outgoing) txCountMap.set(x.partnerId, (txCountMap.get(x.partnerId) || 0) + 1);
    for (const x of payments) txCountMap.set(x.partnerId, (txCountMap.get(x.partnerId) || 0) + 1);

    return partners
      .map((p) => ({
        ...p,
        ...(balanceMap.get(p.id) || { totalIncomingLedger: 0, totalPaidDebt: 0, totalOutgoing: 0, totalWithdrawn: 0, balance: 0 }),
        txCount: txCountMap.get(p.id) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [partners, refreshKey]);

  const selectedPartner = useMemo(() => {
    return selectedPartnerId ? partnersWithBalances.find((p) => p.id === selectedPartnerId) || null : null;
  }, [partnersWithBalances, selectedPartnerId]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return partnersWithBalances;
    return partnersWithBalances.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q)) || (p.address && p.address.toLowerCase().includes(q))
    );
  }, [partnersWithBalances, searchQuery]);

  const selectedPartnersList = useMemo(
    () => partnersWithBalances.filter((p) => selectedPartnerIds.has(p.id)),
    [partnersWithBalances, selectedPartnerIds]
  );

  const handleToggleSelectAll = () => {
    if (filteredPartners.length > 0 && filteredPartners.every((p) => selectedPartnerIds.has(p.id))) {
      setSelectedPartnerIds(new Set());
    } else {
      setSelectedPartnerIds(new Set(filteredPartners.map((p) => p.id)));
    }
  };

  const handleTogglePartnerSelect = (partnerId: string) => {
    setSelectedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(partnerId)) next.delete(partnerId);
      else next.add(partnerId);
      return next;
    });
  };

  const handleOpenPayment = (partner: PartnerWithBalance, type: "withdraw" | "pay_debt") => {
    setPaymentPartner(partner);
    setPaymentType(type);
    setFormAmount("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (!paymentPartner) return;
    const amount = parseFloat(formAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Error", description: "Nominal uang harus lebih dari 0", variant: "destructive" });
      return;
    }
    if (paymentType === "withdraw" && paymentPartner.balance < amount) {
      toast({ title: "Peringatan", description: "Saldo tabungan/deposit tidak mencukupi untuk ditarik", variant: "destructive" });
      return;
    }

    addPartnerPayment({ partnerId: paymentPartner.id, date: formDate, type: paymentType, amount });
    toast({
      title: "Berhasil",
      description: paymentType === "pay_debt" ? "Setor tunai berhasil dicatat" : "Penarikan tunai berhasil dicatat",
    });

    setRefreshKey((prev) => prev + 1);
    setPaymentDialogOpen(false);
    setPaymentPartner(null);
    setFormAmount("");
  };

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    if (entryToDelete.type !== "payment") {
      toast({
        title: "Peringatan",
        description: "Silakan hapus transaksi ini di halaman asalnya (Setoran Barang atau Ambil Barang)",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      return;
    }

    const success = deletePartnerPayment(entryToDelete.id);
    if (success) {
      toast({ title: "Berhasil", description: "Transaksi berhasil dihapus dari buku rekap" });
      setRefreshKey((prev) => prev + 1);
    } else {
      toast({ title: "Error", description: "Gagal menghapus transaksi", variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const handleExport = useCallback(
    async (
      action: "print" | "image" | "share",
      targets: PartnerWithBalance[],
      entriesOverride?: LedgerEntry[],
      dateRange?: { from?: Date; to?: Date }
    ) => {
    if (!targets.length) return;
    const nowStr = format(new Date(), "yyyyMMdd-HHmmss");
    const isAndroid = typeof window !== "undefined" && window.AndroidBridge;
    const desc = isAndroid ? "Rekap mitra berhasil disimpan di Download/WarungPOS/Image/" : "Rekap mitra berhasil disimpan sebagai gambar PNG";

    if (targets.length === 1) {
      const partner = targets[0];
      const entries = entriesOverride ?? getPartnerLedger(partner.id);
      const options = buildPartnerStatementOptions(partner, entries, dateRange);
      const slug = partner.name.replace(/\s+/g, "-");
      const filename = `rekap-mitra-${slug}-${nowStr}.png`;

      if (action === "print") printStatementDocument(options, `Rekap-Mitra-${slug}`);
      else if (action === "image") {
        await saveStatementImage(options, { filename, folder: "Image", toastTitle: "Rekap Mitra Disimpan", toastDescription: desc });
      } else {
        await shareStatementImage(options, { filename, title: `Buku Rekap Mitra - ${partner.name}`, errorTitle: "Gagal Membagikan", errorDescription: "Terjadi kesalahan saat membagikan rekap mitra" });
      }
      return;
    }

    const items = targets.map((p) => ({
      options: buildPartnerStatementOptions(p, getPartnerLedger(p.id)),
      filename: `rekap-mitra-${p.name.replace(/\s+/g, "-")}-${nowStr}.png`,
    }));

    if (action === "print") {
      printMultipleStatementDocuments(items.map((i) => i.options), "Rekap-Buku-Mitra");
    } else if (action === "image") {
      await saveMultipleStatementImages(items, { folder: "Image", toastTitle: "Rekap Disimpan", toastDescription: desc });
      toast({ title: "Rekap Disimpan", description: `${items.length} rekap mitra berhasil disimpan sebagai gambar` });
    } else {
      try {
        await shareMultipleStatementImages(items, `Rekap Buku (${items.length} Mitra)`);
        toast({ title: "Berhasil", description: `${items.length} rekap mitra siap dibagikan` });
      } catch {
        toast({ title: "Gagal Membagikan", description: "Terjadi kesalahan saat membagikan rekap mitra", variant: "destructive" });
      }
    }
  }, [toast]);

  const bulkActions = useMemo<ActionBarItem[]>(
    () => [
      { id: "print", label: "Cetak", icon: Printer, onClick: () => handleExport("print", selectedPartnersList), disabled: selectedPartnerIds.size === 0 },
      { id: "image", label: "Gambar", icon: Download, onClick: () => handleExport("image", selectedPartnersList), disabled: selectedPartnerIds.size === 0 },
      { id: "share", label: "Bagikan", icon: Share2, onClick: () => handleExport("share", selectedPartnersList), disabled: selectedPartnerIds.size === 0 },
    ],
    [selectedPartnerIds, selectedPartnersList, handleExport]
  );

  const rawLedgerEntries = useMemo(() => {
    void refreshKey;
    return selectedPartnerId ? getPartnerLedger(selectedPartnerId) : [];
  }, [selectedPartnerId, refreshKey]);

  const detailEntries = useMemo(() => {
    if (!dateFrom && !dateTo) return rawLedgerEntries;
    return rawLedgerEntries.filter((entry) => {
      const d = parseEntryDate(entry.date);
      if (dateFrom && dateTo) return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      if (dateFrom) return d >= startOfDay(dateFrom);
      if (dateTo) return d <= endOfDay(dateTo);
      return true;
    });
  }, [rawLedgerEntries, dateFrom, dateTo]);

  const renderRowMenu = (p: PartnerWithBalance) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setSelectedPartnerId(p.id)}>
          <User className="w-4 h-4 mr-2" />
          Buka Buku
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("print", [p])}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak Rekap / Dokumen
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("image", [p])}>
          <Download className="w-4 h-4 mr-2" />
          Simpan Gambar (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("share", [p])}>
          <Share2 className="w-4 h-4 mr-2" />
          Bagikan Rekap
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenPayment(p, "pay_debt")}>
          <ArrowDownRight className="w-4 h-4 mr-2 text-emerald-600" />
          Setor Tunai
        </DropdownMenuItem>
        {p.balance > 0 && (
          <DropdownMenuItem onClick={() => handleOpenPayment(p, "withdraw")}>
            <ArrowUpRight className="w-4 h-4 mr-2 text-destructive" />
            Tarik Tunai
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const amountNumber = Number(formAmount) || 0;
  const computedPaymentBalance = paymentPartner
    ? paymentType === "pay_debt"
      ? paymentPartner.balance + amountNumber
      : paymentPartner.balance - amountNumber
    : 0;

  const renderDatePicker = (date: Date | undefined, onSelect: (d: Date | undefined) => void, placeholder: string) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-10 text-sm justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  const renderPaymentDialog = () => (
    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold">
            {paymentType === "pay_debt" ? "Setor Tunai (Bayar Hutang)" : "Tarik Tunai Tabungan"}
          </DialogTitle>
        </DialogHeader>
        {paymentPartner && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 py-2 border-b border-border/40 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mitra:</span>
                <span className="font-bold text-foreground">{paymentPartner.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Posisi Saldo:</span>
                <span className={cn("font-bold font-mono", formatBalance(paymentPartner.balance).className)}>
                  {formatBalance(paymentPartner.balance).text} ({paymentPartner.balance >= 0 ? "Tabungan" : "Hutang"})
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tanggal Transaksi *</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-10 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Uang *</Label>
              <PriceInput value={formAmount} onChange={setFormAmount} placeholder="0" className="h-10 text-sm font-mono" />
            </div>

            <div className="py-2 flex justify-between items-center text-sm border-t border-border/40">
              <span className="text-muted-foreground text-xs">Sisa Saldo Setelah Transaksi:</span>
              <span className={cn("font-bold font-mono", formatBalance(computedPaymentBalance).className)}>
                {formatBalance(computedPaymentBalance).text} ({computedPaymentBalance >= 0 ? "Tabungan" : "Hutang"})
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-3 border-t border-border/40">
          <Button variant="outline" className="flex-1 h-10 text-sm font-medium" onClick={() => setPaymentDialogOpen(false)}>
            Batal
          </Button>
          <Button className="flex-1 h-10 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handlePaymentSubmit}>
            Simpan Transaksi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      {selectedPartner ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSelectedPartnerId(null); setDateFrom(undefined); setDateTo(undefined); }}
              className="h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{selectedPartner.name}</h2>
              <p className="text-sm text-muted-foreground">Rincian Buku Rekap & Mutasi Saldo</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => handleExport("print", [selectedPartner], detailEntries, { from: dateFrom, to: dateTo })} title="Cetak / Simpan PDF">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => handleExport("image", [selectedPartner], detailEntries, { from: dateFrom, to: dateTo })} title="Simpan Gambar PNG">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => handleExport("share", [selectedPartner], detailEntries, { from: dateFrom, to: dateTo })} title="Bagikan Rekap">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button onClick={() => handleOpenPayment(selectedPartner, "pay_debt")} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
                <ArrowDownRight className="w-4 h-4" />
                <span className="hidden sm:inline">Setor Tunai</span>
                <span className="sm:hidden">Setor</span>
              </Button>
              <Button variant="outline" onClick={() => handleOpenPayment(selectedPartner, "withdraw")} disabled={selectedPartner.balance <= 0} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
                <ArrowUpRight className="w-4 h-4" />
                <span className="hidden sm:inline">Tarik Tunai</span>
                <span className="sm:hidden">Tarik</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderDatePicker(dateFrom, setDateFrom, "Dari tanggal")}
            <span className="text-muted-foreground">-</span>
            {renderDatePicker(dateTo, setDateTo, "Sampai tanggal")}
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-10 px-3 text-sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="py-3 px-1 border-b border-border/40 flex justify-between items-baseline">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {selectedPartner.balance >= 0 ? "Total Tabungan Mitra" : "Total Hutang Mitra"}
                </p>
                <p className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 tabular-nums font-mono", formatBalance(selectedPartner.balance).className)}>
                  {formatBalance(selectedPartner.balance).text}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{detailEntries.length} entri riwayat</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Total Setoran:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(selectedPartner.totalIncomingLedger + selectedPartner.totalPaidDebt)}
                </span>
              </div>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <span>Total Pengambilan:</span>
                <span className="font-bold font-mono text-destructive">
                  -{formatCurrency(selectedPartner.totalOutgoing + selectedPartner.totalWithdrawn)}
                </span>
              </div>
            </div>

            {detailEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm font-medium">Tidak ada transaksi yang cocok</p>
                <p className="text-xs mt-1">Coba ubah rentang tanggal yang dipilih</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-y border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu</TableHead>
                      <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keterangan</TableHead>
                      <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-destructive">Debet (-)</TableHead>
                      <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-500">Kredit (+)</TableHead>
                      <TableHead className="py-3 text-center w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/30">
                    {detailEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-3.5 px-3 text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-mono">
                          {format(parseEntryDate(entry.date), "dd/MM/yy", { locale: localeId })}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-medium text-foreground">{entry.description}</TableCell>
                        <TableCell className="py-3.5 px-3 text-right font-mono font-semibold text-sm tabular-nums text-destructive">
                          {entry.debit > 0 ? `-${formatCurrency(entry.debit)}` : "-"}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-right font-mono font-semibold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? `+${formatCurrency(entry.credit)}` : "-"}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-center">
                          {entry.type === "payment" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => { setEntryToDelete(entry); setDeleteDialogOpen(true); }}
                              title="Hapus transaksi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground" title="Hapus di menu asalnya">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ResponsiveActionBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari nama mitra..."
            isSearchDisabled={isSearchDisabled}
            selectedCount={selectedPartnerIds.size}
            actions={bulkActions}
            rightElement={
              selectedPartnerIds.size > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedPartnerIds(new Set())}
                >
                  Batal
                </Button>
              ) : null
            }
          />

          {filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Tidak ada data mitra</p>
              <p className="text-xs mt-1">Data buku rekap mitra akan muncul di sini</p>
            </div>
          ) : isMobile ? (
            <div className="border-y border-border/40">
              <div className="py-2.5 px-1 flex items-center justify-between gap-2.5 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 -m-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={filteredPartners.length > 0 && filteredPartners.every((p) => selectedPartnerIds.has(p.id))}
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </div>
                  <span>Nama</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-right min-w-[60px]">Total</span>
                  <span className="w-8 text-center">Aksi</span>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {filteredPartners.map((p) => {
                  const isChecked = selectedPartnerIds.has(p.id);
                  const bal = formatBalance(p.balance);

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "py-3 px-1 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors",
                        isChecked && "bg-primary/5"
                      )}
                      onClick={() => setSelectedPartnerId(p.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1 -m-1 shrink-0" onClick={(e) => { e.stopPropagation(); handleTogglePartnerSelect(p.id); }}>
                          <Checkbox checked={isChecked} onCheckedChange={() => handleTogglePartnerSelect(p.id)} />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.txCount} transaksi</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-1.5 shrink-0">
                        <p className={cn("font-bold text-sm sm:text-base tabular-nums font-mono", bal.className)}>
                          {bal.text}
                        </p>
                        {renderRowMenu(p)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="w-[40px] py-3 text-center">
                      <Checkbox
                        checked={filteredPartners.length > 0 && filteredPartners.every((p) => selectedPartnerIds.has(p.id))}
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mitra Pengepul</TableHead>
                    <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                    <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Saldo</TableHead>
                    <TableHead className="py-3 text-right w-[60px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((p) => {
                    const isChecked = selectedPartnerIds.has(p.id);
                    const bal = formatBalance(p.balance);

                    return (
                      <TableRow
                        key={p.id}
                        className={cn("cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-colors", isChecked && "bg-primary/5")}
                        onClick={() => setSelectedPartnerId(p.id)}
                      >
                        <TableCell className="py-3.5 text-center" onClick={(e) => { e.stopPropagation(); handleTogglePartnerSelect(p.id); }}>
                          <Checkbox checked={isChecked} onCheckedChange={() => handleTogglePartnerSelect(p.id)} />
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm">{p.name}</span>
                              {p.phone && <p className="text-xs text-muted-foreground font-mono">{p.phone}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5">
                            {p.txCount} transaksi
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold tabular-nums font-mono py-3.5 text-sm", bal.className)}>
                          {bal.text}
                        </TableCell>
                        <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                          {renderRowMenu(p)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {renderPaymentDialog()}

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
