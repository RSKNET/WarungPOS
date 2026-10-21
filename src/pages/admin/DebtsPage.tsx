import { useState, useEffect, useMemo, useRef } from "react";
import { Debt } from "@/types/debt";
import { formatCurrency } from "@/lib/format";
import {
  printStatementDocument,
  printMultipleStatementDocuments,
  saveStatementImage,
  saveMultipleStatementImages,
  shareStatementImage,
  shareMultipleStatementImages,
  getStoreReceiptInfo,
  StatementDocumentOptions,
} from "@/lib/statement-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  Search,
  User,
  CreditCard,
  ArrowLeft,
  Banknote,
  Plus,
  Printer,
  Download,
  Share2,
  CalendarIcon,
  X,
  Trash2,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getCustomersWithDebt,
  getDebtsByCustomerId,
  payCustomerDebt,
  getCustomerPayments,
  deleteCustomerDebtHistory,
} from "@/database/debts";
import { toast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { sortAlpha } from "@/lib/sorting";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";

interface CustomerDebtSummary {
  customerId: string;
  customerName: string;
  totalDebt: number;
  debtCount: number;
}

interface DebtTableRow {
  id: string;
  timestamp: string;
  type: "debt" | "payment";
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  debtId?: string;
}

export function DebtsPage() {
  const [customers, setCustomers] = useState<CustomerDebtSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDebtSummary | null>(null);
  const [customerDebts, setCustomerDebts] = useState<Debt[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const {
    searchQuery: search,
    setSearchQuery: setSearch,
    isSearchDisabled,
  } = useSearchInput([payDialogOpen]);

  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    setCustomers(getCustomersWithDebt());
  };

  const loadCustomerDebts = (customerId: string) => {
    setCustomerDebts(getDebtsByCustomerId(customerId));
  };

  const handleSelectCustomer = (customer: CustomerDebtSummary) => {
    setSelectedCustomer(customer);
    loadCustomerDebts(customer.customerId);
  };

  const handleBack = () => {
    setSelectedCustomer(null);
    setCustomerDebts([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    loadCustomers();
  };

  const handleDeleteClick = (customerId: string, customerName: string) => {
    setCustomerToDelete({ id: customerId, name: customerName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;

    const success = deleteCustomerDebtHistory(customerToDelete.id);
    if (success) {
      toast({
        title: "Berhasil",
        description: "Riwayat hutang pelanggan telah dihapus",
      });
      loadCustomers();
    } else {
      toast({
        title: "Gagal",
        description: "Gagal menghapus riwayat hutang",
        variant: "destructive",
      });
    }
    setDeleteConfirmOpen(false);
    setCustomerToDelete(null);
  };

  const handleOpenPayDialog = () => {
    setPaymentAmount(selectedCustomer?.totalDebt || 0);
    setPayDialogOpen(true);
  };

  const handlePayDebt = () => {
    if (!selectedCustomer || paymentAmount <= 0) return;

    const result = payCustomerDebt(selectedCustomer.customerId, paymentAmount);

    if (!result) {
      toast({
        title: "Pembayaran Gagal",
        description: "Tidak ada hutang yang dapat dibayar",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pembayaran Berhasil",
      description: `Pembayaran ${formatCurrency(paymentAmount)} telah dicatat`,
    });

    setPayDialogOpen(false);
    setPaymentAmount(0);

    loadCustomerDebts(selectedCustomer.customerId);
    loadCustomers();

    const updatedCustomers = getCustomersWithDebt();
    const updated = updatedCustomers.find(
      (c) => c.customerId === selectedCustomer.customerId,
    );
    if (updated) {
      setSelectedCustomer(updated);
    } else {
      handleBack();
    }
  };

  const tableRows = useMemo((): DebtTableRow[] => {
    if (!selectedCustomer) return [];

    const rows: DebtTableRow[] = [];

    for (const debt of customerDebts) {
      for (const item of debt.items) {
        rows.push({
          id: `${debt.id}-${item.productId}`,
          timestamp: debt.createdAt,
          type: "debt",
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.subtotal,
          debtId: debt.id,
        });
      }
    }

    const customerPayments = getCustomerPayments(selectedCustomer.customerId);
    for (const payment of customerPayments) {
      rows.push({
        id: payment.id,
        timestamp: payment.createdAt,
        type: "payment",
        totalPrice: -payment.amount,
      });
    }

    const sortedRows = rows.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (dateFrom || dateTo) {
      return sortedRows.filter((row) => {
        const rowDate = new Date(row.timestamp);
        if (dateFrom && dateTo) {
          return isWithinInterval(rowDate, {
            start: startOfDay(dateFrom),
            end: endOfDay(dateTo),
          });
        } else if (dateFrom) {
          return rowDate >= startOfDay(dateFrom);
        } else if (dateTo) {
          return rowDate <= endOfDay(dateTo);
        }
        return true;
      });
    }

    return sortedRows;
  }, [customerDebts, selectedCustomer, dateFrom, dateTo]);

  const buildCustomerStatementOptions = (
    customer: CustomerDebtSummary,
    customRows?: DebtTableRow[],
    dateRange?: { from?: Date; to?: Date },
  ): StatementDocumentOptions => {
    const store = getStoreReceiptInfo();
    const isLunas = customer.totalDebt <= 0;
    const periodeStr = dateRange?.from
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Sekarang"}`
      : "Semua Riwayat";

    let rowsToUse = customRows;
    if (!rowsToUse) {
      const debts = getDebtsByCustomerId(customer.customerId);
      const rows: DebtTableRow[] = [];
      for (const debt of debts) {
        for (const item of debt.items) {
          rows.push({
            id: `${debt.id}-${item.productId}`,
            timestamp: debt.createdAt,
            type: "debt",
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.subtotal,
            debtId: debt.id,
          });
        }
      }
      const customerPayments = getCustomerPayments(customer.customerId);
      for (const payment of customerPayments) {
        rows.push({
          id: payment.id,
          timestamp: payment.createdAt,
          type: "payment",
          totalPrice: -payment.amount,
        });
      }
      rowsToUse = rows.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }

    const sortedRows = [...rowsToUse].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      store,
      meta: {
        title: "NOTA CATATAN HUTANG",
        date: new Date(),
      },
      party: {
        items: [
          { label: "Kepada Yth.", value: customer.customerName },
          { label: "Periode", value: periodeStr },
        ],
        badge: {
          label: "STATUS",
          value: isLunas ? "LUNAS" : "BELUM LUNAS",
          color: isLunas ? "#16a34a" : "#e11d48",
        },
      },
      columns: [
        { key: "no", header: "No", align: "center", width: "35px" },
        { key: "date", header: "Tanggal", width: "105px" },
        { key: "description", header: "Keterangan / Nama Barang" },
        { key: "quantity", header: "Qty", align: "center", width: "50px" },
        { key: "price", header: "Harga", align: "right", width: "100px", isMono: true },
        { key: "amount", header: "Jumlah", align: "right", width: "120px", isMono: true },
      ],
      rows: sortedRows.map((row, index) => {
        const isPayment = row.type === "payment";
        return {
          id: row.id,
          cells: {
            no: { value: index + 1, style: "color: #6b7280;" },
            date: {
              value: format(new Date(row.timestamp), "dd/MM/yy HH:mm", { locale: localeId }),
              style: "color: #4b5563;",
            },
            description: {
              value: isPayment ? "[BAYAR] Pembayaran Hutang" : row.productName || "—",
              style: isPayment ? "font-weight: 700; color: #16a34a;" : "font-weight: 500;",
            },
            quantity: isPayment ? "—" : (row.quantity ?? "—"),
            price: isPayment ? "—" : formatCurrency(row.unitPrice || 0),
            amount: {
              value: isPayment
                ? `- ${formatCurrency(Math.abs(row.totalPrice))}`
                : formatCurrency(row.totalPrice),
              style: isPayment ? "font-weight: 700; color: #16a34a;" : "font-weight: 700;",
            },
          },
        };
      }),
      summaries: [
        {
          label: "Sisa Hutang:",
          value: formatCurrency(customer.totalDebt),
        },
      ],
      signatures: [
        {
          title: "Tanda Terima",
          name: customer.customerName,
        },
        {
          title: "Hormat Kami",
          name: store.storeName,
        },
      ],
      footerNote: "Catatan: Simpan nota ini sebagai bukti catatan hutang piutang yang sah.",
    };
  };

  const getDebtStatementOptions = (): StatementDocumentOptions | null => {
    if (!selectedCustomer) return null;
    return buildCustomerStatementOptions(selectedCustomer, tableRows, { from: dateFrom, to: dateTo });
  };

  const handlePrint = () => {
    const options = getDebtStatementOptions();
    if (!options || !selectedCustomer) return;
    const printDocTitle = `Nota-Hutang-${selectedCustomer.customerName.replace(/\s+/g, "-")}`;
    printStatementDocument(options, printDocTitle);
  };

  const handleSaveImage = async () => {
    const options = getDebtStatementOptions();
    if (!options || !selectedCustomer) return;
    try {
      const fileName = `hutang-${selectedCustomer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
      await saveStatementImage(options, {
        filename: fileName,
        folder: "Image",
        toastTitle: "Nota Disimpan",
        toastDescription:
          typeof window !== "undefined" && window.AndroidBridge
            ? "Nota hutang berhasil disimpan di Download/WarungPOS/Image/"
            : "Nota hutang berhasil disimpan sebagai gambar PNG",
      });
    } catch {
      toast({
        title: "Gagal Menyimpan",
        description: "Gagal memproses gambar rincian hutang",
        variant: "destructive",
      });
    }
  };

  const handleShareImage = async () => {
    const options = getDebtStatementOptions();
    if (!options || !selectedCustomer) return;
    try {
      const fileName = `hutang-${selectedCustomer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
      const title = `Nota Catatan Hutang - ${selectedCustomer.customerName} (${options.store.storeName})`;
      await shareStatementImage(options, {
        filename: fileName,
        title,
        errorTitle: "Gagal Membagikan",
        errorDescription: "Terjadi kesalahan saat membagikan nota hutang",
      });
    } catch {
      toast({
        title: "Gagal Membagikan",
        description: "Gagal membagikan rincian hutang",
        variant: "destructive",
      });
    }
  };

  const handlePrintCustomer = (customer: CustomerDebtSummary) => {
    const options = buildCustomerStatementOptions(customer);
    const printDocTitle = `Nota-Hutang-${customer.customerName.replace(/\s+/g, "-")}`;
    printStatementDocument(options, printDocTitle);
  };

  const handleSaveImageCustomer = async (customer: CustomerDebtSummary) => {
    const options = buildCustomerStatementOptions(customer);
    try {
      const fileName = `hutang-${customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
      await saveStatementImage(options, {
        filename: fileName,
        folder: "Image",
        toastTitle: "Nota Disimpan",
        toastDescription:
          typeof window !== "undefined" && window.AndroidBridge
            ? "Nota hutang berhasil disimpan di Download/WarungPOS/Image/"
            : "Nota hutang berhasil disimpan sebagai gambar PNG",
      });
    } catch {
      toast({
        title: "Gagal Menyimpan",
        description: "Gagal memproses gambar rincian hutang",
        variant: "destructive",
      });
    }
  };

  const handleShareImageCustomer = async (customer: CustomerDebtSummary) => {
    const options = buildCustomerStatementOptions(customer);
    try {
      const fileName = `hutang-${customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
      const title = `Nota Catatan Hutang - ${customer.customerName} (${options.store.storeName})`;
      await shareStatementImage(options, {
        filename: fileName,
        title,
        errorTitle: "Gagal Membagikan",
        errorDescription: "Terjadi kesalahan saat membagikan nota hutang",
      });
    } catch {
      toast({
        title: "Gagal Membagikan",
        description: "Gagal membagikan rincian hutang",
        variant: "destructive",
      });
    }
  };

  const selectedCustomersList = useMemo(() => {
    return customers.filter((c) => selectedCustomerIds.has(c.customerId));
  }, [customers, selectedCustomerIds]);

  const selectedLunasCount = useMemo(() => {
    return selectedCustomersList.filter((c) => c.totalDebt === 0).length;
  }, [selectedCustomersList]);

  const isBulkPrintingRef = useRef(false);

  const handleBulkPrint = () => {
    if (isBulkPrintingRef.current) return;
    if (selectedCustomersList.length === 0) return;
    isBulkPrintingRef.current = true;
    setTimeout(() => {
      isBulkPrintingRef.current = false;
    }, 1500);

    if (selectedCustomersList.length === 1) {
      handlePrintCustomer(selectedCustomersList[0]);
      return;
    }
    const optionsList = selectedCustomersList.map((c) => buildCustomerStatementOptions(c));
    const title = `Nota-Hutang-Massal-${format(new Date(), "yyyyMMdd-HHmm")}`;
    printMultipleStatementDocuments(optionsList, title);
  };

  const handleBulkSaveImage = async () => {
    if (selectedCustomersList.length === 0) return;
    try {
      const items = selectedCustomersList.map((c) => ({
        options: buildCustomerStatementOptions(c),
        filename: `hutang-${c.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmmss")}.png`,
      }));
      await saveMultipleStatementImages(items, {
        folder: "Image",
        toastTitle: "Nota Disimpan",
        toastDescription:
          typeof window !== "undefined" && window.AndroidBridge
            ? "Nota hutang berhasil disimpan di Download/WarungPOS/Image/"
            : "Nota hutang berhasil disimpan sebagai gambar PNG",
      });
      toast({
        title: "Nota Disimpan",
        description: `${selectedCustomersList.length} nota hutang berhasil disimpan sebagai gambar`,
      });
    } catch {
      toast({
        title: "Gagal Menyimpan",
        description: "Gagal memproses gambar rincian hutang",
        variant: "destructive",
      });
    }
  };

  const handleBulkShareImage = async () => {
    if (selectedCustomersList.length === 0) return;
    try {
      const items = selectedCustomersList.map((c) => ({
        options: buildCustomerStatementOptions(c),
        filename: `hutang-${c.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmmss")}.png`,
      }));
      await shareMultipleStatementImages(
        items,
        `Nota Catatan Hutang (${selectedCustomersList.length} Pelanggan)`,
      );
      toast({
        title: "Berhasil",
        description: `${selectedCustomersList.length} nota hutang siap dibagikan`,
      });
    } catch {
      toast({
        title: "Gagal Membagikan",
        description: "Terjadi kesalahan saat membagikan nota hutang",
        variant: "destructive",
      });
    }
  };

  const handleToggleCustomerSelect = (customerId: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredCustomers.every((c) => selectedCustomerIds.has(c.customerId))) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(filteredCustomers.map((c) => c.customerId)));
    }
  };

  const handleConfirmBulkDelete = () => {
    const lunasList = selectedCustomersList.filter((c) => c.totalDebt === 0);
    if (lunasList.length === 0) return;
    let successCount = 0;
    for (const c of lunasList) {
      if (deleteCustomerDebtHistory(c.customerId)) {
        successCount++;
      }
    }
    toast({
      title: "Berhasil",
      description: `${successCount} riwayat pelanggan lunas berhasil dibersihkan`,
    });
    setSelectedCustomerIds(new Set());
    setBulkDeleteConfirmOpen(false);
    loadCustomers();
  };

  const filteredCustomers = useMemo(() => {
    const sorted = sortAlpha(customers, "customerName");
    if (!search.trim()) return sorted;
    const lowerSearch = search.toLowerCase();
    return sorted.filter((c) =>
      c.customerName.toLowerCase().includes(lowerSearch),
    );
  }, [search, customers]);

  if (!selectedCustomer) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
              disabled={isSearchDisabled}
            />
          </div>

          <div className="sm:hidden shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 relative"
                  disabled={selectedCustomerIds.size === 0}
                >
                  <MoreVertical className="w-4 h-4" />
                  {selectedCustomerIds.size > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {selectedCustomerIds.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBulkPrint} disabled={selectedCustomerIds.size === 0}>
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Nota{selectedCustomerIds.size > 0 ? ` (${selectedCustomerIds.size})` : ""}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkSaveImage} disabled={selectedCustomerIds.size === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Simpan Gambar{selectedCustomerIds.size > 0 ? ` (${selectedCustomerIds.size})` : ""}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkShareImage} disabled={selectedCustomerIds.size === 0}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan Nota{selectedCustomerIds.size > 0 ? ` (${selectedCustomerIds.size})` : ""}
                </DropdownMenuItem>
                {selectedLunasCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setBulkDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus Riwayat Lunas ({selectedLunasCount})
                    </DropdownMenuItem>
                  </>
                )}
                {selectedCustomerIds.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedCustomerIds(new Set())}>
                      <X className="w-4 h-4 mr-2" />
                      Batal Pilihan ({selectedCustomerIds.size})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs gap-1.5"
              onClick={handleBulkPrint}
              disabled={selectedCustomerIds.size === 0}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak{selectedCustomerIds.size > 0 ? ` (${selectedCustomerIds.size})` : ""}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs gap-1.5"
              onClick={handleBulkSaveImage}
              disabled={selectedCustomerIds.size === 0}
            >
              <Download className="w-4 h-4" />
              <span>Gambar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs gap-1.5"
              onClick={handleBulkShareImage}
              disabled={selectedCustomerIds.size === 0}
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan</span>
            </Button>
            {selectedLunasCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus ({selectedLunasCount})</span>
              </Button>
            )}
            {selectedCustomerIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedCustomerIds(new Set())}
              >
                Batal
              </Button>
            )}
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CreditCard className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Tidak ada hutang</p>
            <p className="text-xs mt-1">Semua pelanggan sudah melunasi hutang</p>
          </div>
        ) : isMobile ? (
          <div className="border-y border-border/40">
            <div className="py-2.5 px-1 flex items-center justify-between gap-2.5 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="p-1 -m-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={
                      filteredCustomers.length > 0 &&
                      filteredCustomers.every((c) => selectedCustomerIds.has(c.customerId))
                    }
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
              {filteredCustomers.map((customer) => {
                const isChecked = selectedCustomerIds.has(customer.customerId);
                return (
                  <div
                    key={customer.customerId}
                    className={cn(
                      "py-3 px-1 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors",
                      isChecked && "bg-primary/5"
                    )}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="p-1 -m-1 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCustomerSelect(customer.customerId);
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCustomerSelect(customer.customerId)}
                        />
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {customer.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.debtCount} transaksi
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5 shrink-0">
                      <p className="font-bold text-sm sm:text-base text-destructive tabular-nums">
                        {formatCurrency(customer.totalDebt)}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handlePrintCustomer(customer)}>
                            <Printer className="w-4 h-4 mr-2" />
                            Cetak Nota / Dokumen
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSaveImageCustomer(customer)}>
                            <Download className="w-4 h-4 mr-2" />
                            Simpan Gambar (PNG)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareImageCustomer(customer)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Bagikan Nota
                          </DropdownMenuItem>
                          {customer.totalDebt === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClick(customer.customerId, customer.customerName)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Riwayat
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                      checked={
                        filteredCustomers.length > 0 &&
                        filteredCustomers.every((c) => selectedCustomerIds.has(c.customerId))
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pelanggan</TableHead>
                  <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                  <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Hutang</TableHead>
                  <TableHead className="py-3 text-right w-[60px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const isChecked = selectedCustomerIds.has(customer.customerId);
                  return (
                    <TableRow
                      key={customer.customerId}
                      className={cn(
                        "cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-colors",
                        isChecked && "bg-primary/5"
                      )}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <TableCell
                        className="py-3.5 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCustomerSelect(customer.customerId);
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCustomerSelect(customer.customerId)}
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">
                            {customer.customerName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5">
                          {customer.debtCount} transaksi
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive tabular-nums py-3.5 text-sm">
                        {formatCurrency(customer.totalDebt)}
                      </TableCell>
                      <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrintCustomer(customer)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Cetak Nota / Dokumen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSaveImageCustomer(customer)}>
                              <Download className="w-4 h-4 mr-2" />
                              Simpan Gambar (PNG)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShareImageCustomer(customer)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Bagikan Nota
                            </DropdownMenuItem>
                            {customer.totalDebt === 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(customer.customerId, customer.customerName)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Hapus Riwayat
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <ConfirmDeleteDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Hapus Riwayat Hutang?"
          description={
            <>
              Apakah Anda yakin ingin menghapus semua riwayat hutang dan pembayaran lunas untuk{" "}
              <span className="font-semibold text-foreground">{customerToDelete?.name}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </>
          }
          onConfirm={handleConfirmDelete}
        />

        <ConfirmDeleteDialog
          open={bulkDeleteConfirmOpen}
          onOpenChange={setBulkDeleteConfirmOpen}
          title={`Hapus ${selectedLunasCount} Riwayat Pelanggan Lunas?`}
          description="Semua catatan riwayat pembayaran dan hutang dari pelanggan yang sudah lunas yang dipilih akan dihapus secara permanen."
          onConfirm={handleConfirmBulkDelete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {selectedCustomer.customerName}
          </h2>
          <p className="text-sm text-muted-foreground">Rincian Hutang & Catatan Pembayaran</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={handlePrint}
            title="Cetak / Simpan PDF"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={handleSaveImage}
            title="Simpan Gambar PNG"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            onClick={handleShareImage}
            title="Bagikan ke WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          {selectedCustomer.totalDebt > 0 && (
            <Button onClick={handleOpenPayDialog} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold gap-1.5">
              <Banknote className="w-4 h-4" />
              Bayar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-10 text-sm justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Dari tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">-</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-10 text-sm justify-start text-left font-normal",
                !dateTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Sampai tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 text-sm"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div ref={printRef} className="space-y-4">
        <div className="py-3 px-1 border-b border-border/40 flex justify-between items-baseline">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Hutang Pelanggan
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-destructive tracking-tight mt-0.5">
              {formatCurrency(selectedCustomer.totalDebt)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {tableRows.length} entri riwayat
          </span>
        </div>

        <div className="overflow-x-auto border-y border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu</TableHead>
                <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keterangan</TableHead>
                <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harga Satuan</TableHead>
                <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.id} className="border-b border-border/20 text-sm hover:bg-muted/20">
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground py-3.5">
                    {format(new Date(row.timestamp), "dd/MM/yy HH:mm", {
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {row.type === "debt" ? (
                      <span className="font-medium text-foreground">{row.productName}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        Pembayaran
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm py-3.5">
                    {row.type === "debt" ? row.quantity : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground py-3.5">
                    {row.type === "debt"
                      ? formatCurrency(row.unitPrice || 0)
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold text-sm tabular-nums py-3.5 ${row.type === "payment" ? "text-emerald-600" : "text-foreground"}`}
                  >
                    {row.type === "payment"
                      ? formatCurrency(Math.abs(row.totalPrice))
                      : formatCurrency(row.totalPrice)}
                    {row.type === "payment" && (
                      <span className="ml-1 text-xs font-normal">(-)</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>


      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-xl font-bold">Bayar Hutang</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-baseline py-2 border-b border-border/40">
              <span className="text-sm font-medium text-muted-foreground">Total Hutang</span>
              <span className="font-extrabold text-destructive text-xl tracking-tight">
                {formatCurrency(selectedCustomer.totalDebt)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payAmount" className="text-sm font-medium">Jumlah Bayar</Label>
              <Input
                id="payAmount"
                type="number"
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="text-2xl h-12 font-bold"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm font-medium"
                onClick={() => setPaymentAmount(selectedCustomer.totalDebt)}
              >
                Lunas (100%)
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm font-medium"
                onClick={() =>
                  setPaymentAmount(Math.round(selectedCustomer.totalDebt / 2))
                }
              >
                50%
              </Button>
            </div>

            <div className="flex gap-3 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                className="flex-1 h-10 text-sm font-medium"
                onClick={() => setPayDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 h-10 text-sm font-medium"
                onClick={handlePayDebt}
                disabled={
                  paymentAmount <= 0 ||
                  paymentAmount > selectedCustomer.totalDebt
                }
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Riwayat Hutang?"
        description={
          <>
            Apakah Anda yakin ingin menghapus semua riwayat hutang dan pembayaran lunas untuk{" "}
            <span className="font-semibold text-foreground">{customerToDelete?.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </>
        }
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

