import { useState, useEffect, useMemo, useRef } from "react";
import { Debt } from "@/types/debt";
import { formatCurrency } from "@/lib/format";
import { printDocument, saveImageToDevice } from "@/lib/native-bridge";
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
  CalendarIcon,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";
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
import html2canvas from "html2canvas";
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

  const handlePrint = () => {
    if (!selectedCustomer) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rincian Hutang - ${selectedCustomer.customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
          .total-box { background: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .total-label { font-weight: 600; }
          .total-amount { font-size: 24px; font-weight: bold; color: #dc2626; float: right; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .payment { color: #16a34a; font-weight: 500; }
          .footer { margin-top: 20px; font-size: 11px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${selectedCustomer.customerName}</h1>
        <div class="subtitle">Rincian Hutang - Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: localeId })}</div>

        <div class="total-box">
          <span class="total-label">Total Hutang</span>
          <span class="total-amount">${formatCurrency(selectedCustomer.totalDebt)}</span>
          <div style="clear: both;"></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Keterangan</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Harga Satuan</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows
              .map(
                (row) => `
              <tr>
                <td>${format(new Date(row.timestamp), "dd/MM/yy HH:mm", { locale: localeId })}</td>
                <td${row.type === "payment" ? ' class="payment"' : ""}>${row.type === "debt" ? row.productName : "+ Pembayaran"}</td>
                <td class="text-center">${row.type === "debt" ? row.quantity : "-"}</td>
                <td class="text-right">${row.type === "debt" ? formatCurrency(row.unitPrice || 0) : "-"}</td>
                <td class="text-right${row.type === "payment" ? " payment" : ""}">${row.type === "payment" ? formatCurrency(Math.abs(row.totalPrice)) + " (-)" : formatCurrency(row.totalPrice)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">Warung POS - Sistem Kasir Digital</div>
      </body>
      </html>
    `;

    const printDocTitle = `Nota-Hutang-${selectedCustomer.customerName.replace(/\s+/g, "-")}`;
    printDocument(printContent, printDocTitle);
  };

  const handleSaveImage = async () => {
    if (!printRef.current || !selectedCustomer) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const fileName = `hutang-${selectedCustomer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
      const base64Data = canvas.toDataURL("image/png");
      await saveImageToDevice(base64Data, fileName);

      toast({
        title: "Berhasil",
        description: "Rincian hutang berhasil disimpan ke folder WarungPOS/Image",
      });
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Gagal menyimpan gambar",
        variant: "destructive",
      });
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

  const filteredCustomers = useMemo(() => {
    const sorted = sortAlpha(customers, "customerName");
    if (!search.trim()) return sorted;
    const lowerSearch = search.toLowerCase();
    return sorted.filter((c) =>
      c.customerName.toLowerCase().includes(lowerSearch),
    );
  }, [search, customers]);

  const totalAllDebts = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.totalDebt, 0);
  }, [customers]);

  if (!selectedCustomer) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/40">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Piutang</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-destructive tracking-tight mt-0.5">
              {formatCurrency(totalAllDebts)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan Berhutang</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
              {customers.length} <span className="text-sm font-normal text-muted-foreground">orang</span>
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            disabled={isSearchDisabled}
          />
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CreditCard className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Tidak ada hutang</p>
            <p className="text-xs mt-1">Semua pelanggan sudah melunasi hutang</p>
          </div>
        ) : isMobile ? (
          <div className="divide-y divide-border/30 border-y border-border/40">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.customerId}
                className="py-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">
                      {customer.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {customer.debtCount} transaksi
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2 shrink-0">
                  <p className="font-bold text-base text-destructive tabular-nums">
                    {formatCurrency(customer.totalDebt)}
                  </p>
                  {customer.totalDebt === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(customer.customerId, customer.customerName);
                      }}
                      title="Hapus Riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground/60" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pelanggan</TableHead>
                  <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                  <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Hutang</TableHead>
                  <TableHead className="py-3 text-right w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.customerId}
                    className="cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
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
                    <TableCell className="text-right py-3.5">
                      {customer.totalDebt === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(customer.customerId, customer.customerName);
                          }}
                          title="Hapus Riwayat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
        {selectedCustomer.totalDebt > 0 && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={handlePrint}
              title="Cetak"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={handleSaveImage}
              title="Simpan Gambar"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button onClick={handleOpenPayDialog} className="h-10 px-4 text-sm font-medium gap-2">
              <Banknote className="w-4 h-4" />
              Bayar
            </Button>
          </div>
        )}
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

