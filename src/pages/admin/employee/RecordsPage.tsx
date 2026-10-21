import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft, Printer, Download, Share2, MoreVertical,
  Banknote, CalendarIcon, X, User, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PriceInput } from "@/components/ui/price-input";
import { ResponsiveActionBar, ActionBarItem } from "@/components/ResponsiveActionBar";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getEmployees, getEarnings, getEmployeeDebts, getSettlements, createSettlement,
} from "@/database/employees";
import { Employee, EmployeeEarning, EmployeeDebt, EmployeeSettlement } from "@/types/employee";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  StatementDocumentOptions, StatementRow, getStoreReceiptInfo,
  printStatementDocument, printMultipleStatementDocuments,
  saveStatementImage, saveMultipleStatementImages,
  shareStatementImage, shareMultipleStatementImages,
} from "@/lib/statement-document";

export type RecordItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "earning" | "debt" | "settlement";
  category: string;
  description: string;
  amount: number;
  createdAt: string;
};

export type EmployeeRecordSummary = {
  employeeId: string;
  employeeName: string;
  position: string;
  phone?: string;
  records: RecordItem[];
  recordCount: number;
  totalEarning: number;
  totalDebt: number;
  totalSettlement: number;
  balance: number;
};

function buildEmployeeStatementOptions(
  employee: EmployeeRecordSummary,
  records: RecordItem[],
  dateRange?: { from?: Date; to?: Date },
): StatementDocumentOptions {
  const store = getStoreReceiptInfo();
  const totals = records.reduce(
    (acc, r) => {
      if (r.type === "earning") acc.earning += r.amount;
      else if (r.type === "debt") acc.debt += r.amount;
      else acc.settlement += r.category === "Dibayar Admin" ? r.amount : -r.amount;
      return acc;
    },
    { earning: 0, debt: 0, settlement: 0 },
  );

  const balance = totals.earning - totals.debt - totals.settlement;
  const isSurplus = balance >= 0;

  const rows: StatementRow[] = records.map((r, i) => {
    const isDebt = r.type === "debt";
    const isPayAdmin = r.type === "settlement" && r.category === "Dibayar Admin";
    const prefix = isDebt || isPayAdmin ? "-" : "+";
    const color = isDebt ? "#e11d48" : r.type === "earning" ? "#16a34a" : "#d97706";

    return {
      id: r.id || String(i),
      cells: {
        tanggal: { value: format(new Date(r.createdAt), "dd/MM/yyyy", { locale: localeId }), style: "color: #4b5563;" },
        tipe: { value: isDebt ? "Kasbon / Hutang" : r.category, style: "font-weight: 600;" },
        keterangan: { value: r.description || "—", style: "font-weight: 500;" },
        nominal: { value: `${prefix}${formatCurrency(r.amount)}`, style: `font-weight: 700; color: ${color};`, isMono: true },
      },
    };
  });

  let periodeStr = "Semua Riwayat";
  if (dateRange?.from && dateRange?.to) {
    periodeStr = `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
  } else if (dateRange?.from) {
    periodeStr = `Dari ${format(dateRange.from, "dd/MM/yyyy")}`;
  } else if (dateRange?.to) {
    periodeStr = `Sampai ${format(dateRange.to, "dd/MM/yyyy")}`;
  }

  return {
    store,
    meta: { title: "REKAP PENCATATAN KARYAWAN", date: new Date() },
    party: {
      items: [
        { label: "Nama Karyawan", value: employee.employeeName },
        { label: "Jabatan", value: employee.position || "Karyawan" },
        { label: "Periode", value: periodeStr },
      ],
      badge: {
        label: "STATUS SALDO",
        value: balance === 0 ? "LUNAS / IMPAS" : isSurplus ? "SISA HAK GAJI" : "KASBON",
        color: balance === 0 ? "#64748b" : isSurplus ? "#16a34a" : "#e11d48",
      },
    },
    columns: [
      { key: "tanggal", header: "TANGGAL", width: "95px" },
      { key: "tipe", header: "TIPE TRANSAKSI", width: "135px" },
      { key: "keterangan", header: "KETERANGAN" },
      { key: "nominal", header: "NOMINAL", width: "135px", align: "right", isMono: true },
    ],
    rows,
    summaries: [
      { label: "Total Pendapatan (Gaji/Komisi)", value: formatCurrency(totals.earning) },
      { label: "Total Kasbon / Hutang", value: formatCurrency(totals.debt) },
      { label: "Total Pembayaran", value: formatCurrency(totals.settlement) },
      { label: isSurplus ? "Sisa Hak Gaji Karyawan" : "Sisa Kasbon Karyawan", value: formatCurrency(Math.abs(balance)), isHighlight: true },
    ],
    signatures: [{ title: "Dibuat Oleh", name: store.storeName }, { title: "Karyawan", name: employee.employeeName }],
    footerNote: "Dokumen ini dicetak otomatis dari sistem WarungPOS sebagai bukti rekap pencatatan karyawan yang sah.",
  };
}

export function RecordsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [employees] = useState<Employee[]>(() => getEmployees());
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecordSummary | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([settlementDialogOpen]);

  useEffect(() => {
    if (settlementTarget) setSettlementAmount(Math.abs(settlementTarget.balance).toString());
  }, [settlementTarget]);

  const allRecords = useMemo(() => [
    ...getEarnings().map((e: EmployeeEarning) => ({ id: `earning-${e.id}`, employeeId: e.employeeId, employeeName: e.employeeName, type: "earning" as const, category: e.type === "salary" ? "Pokok" : "Komisi", description: e.description, amount: e.amount, createdAt: e.createdAt })),
    ...getEmployeeDebts().map((d: EmployeeDebt) => ({ id: `debt-${d.id}`, employeeId: d.employeeId, employeeName: d.employeeName, type: "debt" as const, category: "Hutang", description: d.description, amount: d.amount, createdAt: d.createdAt })),
    ...getSettlements().map((s: EmployeeSettlement) => ({ id: `settlement-${s.id}`, employeeId: s.employeeId, employeeName: s.employeeName, type: "settlement" as const, category: s.type === "admin_to_employee" ? "Dibayar Admin" : "Dibayar Pekerja", description: s.description, amount: s.amount, createdAt: s.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [refreshKey]);

  const employeeSummaries = useMemo(() => {
    const recordsByEmpId: Record<string, RecordItem[]> = {};
    for (const r of allRecords) (recordsByEmpId[r.employeeId] ??= []).push(r);

    const empMap = new Map<string, { id: string; name: string; position: string; phone?: string }>();
    (employees.length ? employees : getEmployees()).forEach((e) =>
      empMap.set(e.id, { id: e.id, name: e.name, position: e.position || "Karyawan", phone: e.phone }),
    );

    for (const [id, recs] of Object.entries(recordsByEmpId)) {
      if (!empMap.has(id)) empMap.set(id, { id, name: recs[0]?.employeeName || "Karyawan", position: "Karyawan" });
    }

    return Array.from(empMap.values())
      .map((emp) => {
        const records = recordsByEmpId[emp.id] || [];
        const totals = records.reduce(
          (acc, r) => {
            if (r.type === "earning") acc.earning += r.amount;
            else if (r.type === "debt") acc.debt += r.amount;
            else acc.settlement += r.category === "Dibayar Admin" ? r.amount : -r.amount;
            return acc;
          },
          { earning: 0, debt: 0, settlement: 0 },
        );

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          position: emp.position,
          phone: emp.phone,
          records,
          recordCount: records.length,
          totalEarning: totals.earning,
          totalDebt: totals.debt,
          totalSettlement: totals.settlement,
          balance: totals.earning - totals.debt - totals.settlement,
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [employees, allRecords]);

  useEffect(() => {
    if (selectedEmployee) {
      const updated = employeeSummaries.find((e) => e.employeeId === selectedEmployee.employeeId);
      if (updated) setSelectedEmployee(updated);
    }
  }, [employeeSummaries]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employeeSummaries.filter(
      (emp) => emp.employeeName.toLowerCase().includes(q) || emp.position.toLowerCase().includes(q),
    );
  }, [employeeSummaries, searchQuery]);

  const selectedEmployeesList = useMemo(
    () => employeeSummaries.filter((e) => selectedEmployeeIds.has(e.employeeId)),
    [employeeSummaries, selectedEmployeeIds],
  );

  const handleToggleSelectAll = () => {
    if (filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.has(e.employeeId))) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredEmployees.map((e) => e.employeeId)));
    }
  };

  const handleToggleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const handleOpenSettlement = (employee: { employeeId: string; employeeName: string; balance: number }) => {
    setSettlementTarget({ id: employee.employeeId, name: employee.employeeName, balance: employee.balance });
    setSettlementDialogOpen(true);
  };

  const confirmSettlement = () => {
    if (!settlementTarget || settlementTarget.balance === 0) return;
    const amount = Number(settlementAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Error", description: "Nominal harus lebih dari 0", variant: "destructive" });
      return;
    }

    const isAdminPaying = settlementTarget.balance > 0;
    createSettlement({
      employeeId: settlementTarget.id,
      employeeName: settlementTarget.name,
      type: isAdminPaying ? "admin_to_employee" : "employee_to_admin",
      amount,
      description: isAdminPaying ? "Pembayaran gaji ke karyawan" : "Pelunasan hutang dari karyawan",
    });

    toast({
      title: "Berhasil",
      description: isAdminPaying
        ? `Pembayaran ${formatCurrency(amount)} ke ${settlementTarget.name} dicatat`
        : `Pelunasan ${formatCurrency(amount)} dari ${settlementTarget.name} dicatat`,
    });

    setSettlementDialogOpen(false);
    setSettlementTarget(null);
    setSettlementAmount("");
    setRefreshKey((prev) => prev + 1);
  };

  const handleExport = async (
    action: "print" | "image" | "share",
    targets: EmployeeRecordSummary[],
    recordsOverride?: RecordItem[],
    dateRange?: { from?: Date; to?: Date },
  ) => {
    if (!targets.length) return;
    const nowStr = format(new Date(), "yyyyMMdd-HHmmss");

    if (targets.length === 1) {
      const emp = targets[0];
      const recs = recordsOverride ?? emp.records;
      const options = buildEmployeeStatementOptions(emp, recs, dateRange);
      const slug = emp.employeeName.replace(/\s+/g, "-");

      if (action === "print") printStatementDocument(options, `Rekap-Karyawan-${slug}`);
      else if (action === "image") {
        await saveStatementImage(options, {
          filename: `rekap-karyawan-${slug}-${nowStr}.png`,
          toastTitle: "Rekap Karyawan Disimpan",
          toastDescription: typeof window !== "undefined" && window.AndroidBridge ? "Rekap karyawan berhasil disimpan di Download/WarungPOS/Image/" : "Rekap karyawan berhasil disimpan sebagai gambar PNG",
        });
      } else {
        await shareStatementImage(options, { filename: `rekap-karyawan-${slug}-${nowStr}.png`, title: `Rekap Pencatatan Karyawan - ${emp.employeeName}` });
      }
      return;
    }

    const items = targets.map((emp) => ({
      options: buildEmployeeStatementOptions(emp, emp.records),
      filename: `rekap-karyawan-${emp.employeeName.replace(/\s+/g, "-")}-${nowStr}.png`,
    }));

    if (action === "print") {
      printMultipleStatementDocuments(items.map((i) => i.options), "Rekap-Pencatatan-Karyawan");
    } else if (action === "image") {
      await saveMultipleStatementImages(items, {
        folder: "Image",
        toastTitle: "Rekap Disimpan",
        toastDescription: typeof window !== "undefined" && window.AndroidBridge ? "Rekap karyawan berhasil disimpan di Download/WarungPOS/Image/" : "Rekap karyawan berhasil disimpan sebagai gambar PNG",
      });
      toast({ title: "Rekap Disimpan", description: `${items.length} rekap karyawan berhasil disimpan sebagai gambar` });
    } else {
      try {
        await shareMultipleStatementImages(items, `Rekap Pencatatan (${items.length} Karyawan)`);
        toast({ title: "Berhasil", description: `${items.length} rekap karyawan siap dibagikan` });
      } catch {
        toast({ title: "Gagal Membagikan", description: "Terjadi kesalahan saat membagikan rekap karyawan", variant: "destructive" });
      }
    }
  };

  const bulkActions = useMemo<ActionBarItem[]>(() => [
    { id: "print", label: "Cetak", icon: Printer, onClick: () => handleExport("print", selectedEmployeesList), disabled: selectedEmployeeIds.size === 0 },
    { id: "image", label: "Gambar", icon: Download, onClick: () => handleExport("image", selectedEmployeesList), disabled: selectedEmployeeIds.size === 0 },
    { id: "share", label: "Bagikan", icon: Share2, onClick: () => handleExport("share", selectedEmployeesList), disabled: selectedEmployeeIds.size === 0 },
  ], [selectedEmployeeIds, selectedEmployeesList]);

  const detailRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    if (!dateFrom && !dateTo) return selectedEmployee.records;
    return selectedEmployee.records.filter((r) => {
      const d = new Date(r.createdAt);
      if (dateFrom && dateTo) return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      if (dateFrom) return d >= startOfDay(dateFrom);
      if (dateTo) return d <= endOfDay(dateTo);
      return true;
    });
  }, [selectedEmployee, dateFrom, dateTo]);

  const renderRowMenu = (emp: EmployeeRecordSummary) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setSelectedEmployee(emp)}>
          <User className="w-4 h-4 mr-2" />
          Lihat Rincian
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("print", [emp])}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak Rekap / Dokumen
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("image", [emp])}>
          <Download className="w-4 h-4 mr-2" />
          Simpan Gambar (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("share", [emp])}>
          <Share2 className="w-4 h-4 mr-2" />
          Bagikan Rekap
        </DropdownMenuItem>
        {emp.balance !== 0 && (
          <DropdownMenuItem onClick={() => handleOpenSettlement(emp)}>
            <Banknote className="w-4 h-4 mr-2 text-emerald-600" />
            Bayar / Lunasi
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const amountNumber = Number(settlementAmount) || 0;
  const computedBalance = settlementTarget
    ? settlementTarget.balance > 0
      ? settlementTarget.balance - amountNumber
      : settlementTarget.balance + amountNumber
    : 0;

  const renderSettlementDialog = () => (
    <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold">Bayar / Lunasi Karyawan</DialogTitle>
        </DialogHeader>
        {settlementTarget && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 py-2 border-b border-border/40 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Karyawan:</span>
                <span className="font-bold text-foreground">{settlementTarget.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Posisi Saldo:</span>
                <span className={`font-bold font-mono ${settlementTarget.balance >= 0 ? "text-primary" : "text-destructive"}`}>
                  {settlementTarget.balance >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(settlementTarget.balance))} ({settlementTarget.balance >= 0 ? "Hak Gaji" : "Kasbon"})
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Pembayaran *</Label>
              <PriceInput value={settlementAmount} onChange={setSettlementAmount} placeholder="0" className="h-10 text-sm font-mono" />
            </div>
            <div className="py-2 flex justify-between items-center text-sm border-t border-border/40">
              <span className="text-muted-foreground text-xs">Sisa Saldo Setelah Bayar:</span>
              <span className={`font-bold font-mono ${computedBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                {computedBalance >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(computedBalance))}
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-3 border-t border-border/40">
          <Button variant="outline" className="flex-1 h-10 text-sm font-medium" onClick={() => setSettlementDialogOpen(false)}>
            Batal
          </Button>
          <Button className="flex-1 h-10 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white" onClick={confirmSettlement}>
            Konfirmasi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (selectedEmployee) {
    const isSurplus = selectedEmployee.balance >= 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSelectedEmployee(null); setDateFrom(undefined); setDateTo(undefined); }}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{selectedEmployee.employeeName}</h2>
            <p className="text-sm text-muted-foreground">{selectedEmployee.position} • Rincian Saldo & Catatan Transaksi</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => handleExport("print", [selectedEmployee], detailRecords, { from: dateFrom, to: dateTo })} title="Cetak / Simpan PDF">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => handleExport("image", [selectedEmployee], detailRecords, { from: dateFrom, to: dateTo })} title="Simpan Gambar PNG">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => handleExport("share", [selectedEmployee], detailRecords, { from: dateFrom, to: dateTo })} title="Bagikan Rekap">
              <Share2 className="w-4 h-4" />
            </Button>
            {selectedEmployee.balance !== 0 && (
              <Button onClick={() => handleOpenSettlement(selectedEmployee)} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold gap-1.5">
                <Banknote className="w-4 h-4" />
                Bayar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-10 text-sm justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Dari tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">-</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-10 text-sm justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Sampai tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

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
                {isSurplus ? "Sisa Hak Gaji Karyawan" : "Total Kasbon Karyawan"}
              </p>
              <p className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 tabular-nums font-mono", isSurplus ? "text-primary" : "text-destructive")}>
                {selectedEmployee.balance === 0 ? "" : isSurplus ? "+" : "-"}
                {formatCurrency(Math.abs(selectedEmployee.balance))}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{detailRecords.length} entri riwayat</span>
          </div>

          {detailRecords.length === 0 ? (
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
                    <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipe</TableHead>
                    <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/30">
                  {detailRecords.map((record) => {
                    const isDebt = record.type === "debt";
                    const isPay = record.type === "settlement";
                    const badgeClass = isDebt ? "bg-destructive/10 text-destructive border-destructive/20" : isPay ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20";
                    const textClass = isDebt ? "text-destructive" : isPay ? "text-amber-600 dark:text-amber-400" : "text-primary";
                    const prefix = isDebt || (isPay && record.category === "Dibayar Admin") ? "-" : "+";

                    return (
                      <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-3.5 px-3 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(record.createdAt), "dd/MM/yy HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-medium text-foreground">{record.description || "—"}</TableCell>
                        <TableCell className="py-3.5 px-3 text-center">
                          <Badge variant="outline" className={`${badgeClass} text-xs px-2 py-0.5 font-medium`}>
                            {record.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={`py-3.5 px-3 text-right font-mono font-semibold text-sm tabular-nums ${textClass}`}>
                          {prefix}{formatCurrency(record.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {renderSettlementDialog()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveActionBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari karyawan..."
        isSearchDisabled={isSearchDisabled}
        selectedCount={selectedEmployeeIds.size}
        actions={bulkActions}
        rightElement={
          selectedEmployeeIds.size > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedEmployeeIds(new Set())}
            >
              Batal
            </Button>
          ) : null
        }
      />

      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">Tidak ada pencatatan</p>
          <p className="text-xs mt-1">Data pencatatan karyawan akan muncul di sini</p>
        </div>
      ) : isMobile ? (
        <div className="border-y border-border/40">
          <div className="py-2.5 px-1 flex items-center justify-between gap-2.5 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 -m-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.has(e.employeeId))}
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
            {filteredEmployees.map((emp) => {
              const isChecked = selectedEmployeeIds.has(emp.employeeId);
              const isSurplus = emp.balance >= 0;

              return (
                <div
                  key={emp.employeeId}
                  className={cn(
                    "py-3 px-1 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors",
                    isChecked && "bg-primary/5",
                  )}
                  onClick={() => setSelectedEmployee(emp)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 -m-1 shrink-0" onClick={(e) => { e.stopPropagation(); handleToggleEmployeeSelect(emp.employeeId); }}>
                      <Checkbox checked={isChecked} onCheckedChange={() => handleToggleEmployeeSelect(emp.employeeId)} />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{emp.employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position} • {emp.recordCount} transaksi</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-1.5 shrink-0">
                    <p className={cn("font-bold text-sm sm:text-base tabular-nums font-mono", emp.balance === 0 ? "text-muted-foreground" : isSurplus ? "text-primary" : "text-destructive")}>
                      {emp.balance === 0 ? "" : isSurplus ? "+" : "-"}
                      {formatCurrency(Math.abs(emp.balance))}
                    </p>
                    {renderRowMenu(emp)}
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
                    checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.has(e.employeeId))}
                    onCheckedChange={handleToggleSelectAll}
                  />
                </TableHead>
                <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Karyawan</TableHead>
                <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Saldo</TableHead>
                <TableHead className="py-3 text-right w-[60px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                const isChecked = selectedEmployeeIds.has(emp.employeeId);
                const isSurplus = emp.balance >= 0;

                return (
                  <TableRow
                    key={emp.employeeId}
                    className={cn(
                      "cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-colors",
                      isChecked && "bg-primary/5",
                    )}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell className="py-3.5 text-center" onClick={(e) => { e.stopPropagation(); handleToggleEmployeeSelect(emp.employeeId); }}>
                      <Checkbox checked={isChecked} onCheckedChange={() => handleToggleEmployeeSelect(emp.employeeId)} />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-sm">{emp.employeeName}</span>
                          <p className="text-xs text-muted-foreground">{emp.position}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3.5">
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5">
                        {emp.recordCount} transaksi
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right font-bold tabular-nums font-mono py-3.5 text-sm", emp.balance === 0 ? "text-muted-foreground" : isSurplus ? "text-primary" : "text-destructive")}>
                      {emp.balance === 0 ? "" : isSurplus ? "+" : "-"}
                      {formatCurrency(Math.abs(emp.balance))}
                    </TableCell>
                    <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                      {renderRowMenu(emp)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {renderSettlementDialog()}
    </div>
  );
}
