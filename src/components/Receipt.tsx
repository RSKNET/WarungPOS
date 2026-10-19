import { useState, useEffect, useRef, forwardRef } from "react";
import { Transaction } from "@/types/pos";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  isBluetoothPrinterConnected,
  connectBluetoothPrinter,
} from "@/lib/native-bridge";
import {
  ReceiptItemData,
  StoreSettingsData,
  getStoredSettings,
  renderReceiptCanvas,
  saveReceiptPng,
  shareReceiptPng,
  executeThermalPrint,
} from "@/lib/thermal-printer";

export type { ReceiptItemData, StoreSettingsData };

export interface ReceiptPaperProps {
  settings: StoreSettingsData;
  transactionId?: string;
  dateStr?: string;
  customerName?: string;
  paymentType?: "cash" | "debt";
  items: ReceiptItemData[];
  subtotal?: number;
  tax?: number;
  total: number;
  payment: number;
  change: number;
  maxListHeight?: string;
  listRef?: React.Ref<HTMLDivElement>;
}

export const ReceiptPaper = forwardRef<HTMLDivElement, ReceiptPaperProps>(
  (
    {
      settings,
      transactionId,
      dateStr,
      customerName,
      paymentType = "cash",
      items,
      subtotal,
      tax = 0,
      total,
      payment,
      change,
      maxListHeight,
      listRef,
    },
    ref,
  ) => {
    const is80mm = settings.paperWidth === "80";
    const tmpl = settings.receiptTemplate || "standard";
    const isCompact = tmpl === "compact";
    const isModern = tmpl === "modern";

    return (
      <div
        ref={ref}
        className={`thermal-receipt-paper text-zinc-900 border border-zinc-200 select-none ${
          is80mm ? "w-[340px] sm:w-[360px]" : "w-[290px] sm:w-[310px]"
        }`}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          lineHeight: 1.3,
        }}
      >
        <div
          className={`flex flex-col ${isCompact ? "p-3 gap-2" : "px-3.5 py-4 gap-2.5"} ${
            is80mm ? (isCompact ? "text-xs" : "text-sm") : (isCompact ? "text-[11px]" : "text-xs")
          }`}
        >
          <div className={`text-center flex flex-col ${isCompact ? "pb-1.5 border-b border-dashed border-zinc-300 gap-0.5" : "pb-2.5 border-b border-dashed border-zinc-400 gap-1"}`}>
            <h3
              className={`font-bold tracking-wider uppercase text-zinc-950 ${
                isModern ? (is80mm ? "text-lg font-black" : "text-base font-black") : (is80mm ? "text-base" : "text-sm")
              }`}
            >
              {settings.storeName || "Nama Toko"}
            </h3>
            {settings.storeAddress && (
              <p className={`text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                {settings.storeAddress}
              </p>
            )}
            {settings.storePhone && (
              <p className={`text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                Telp: {settings.storePhone}
              </p>
            )}

            {isModern ? (
              <div className="bg-zinc-100/90 rounded px-2 py-1 text-zinc-600 text-[11px] mt-1 flex flex-col gap-0.5">
                {dateStr && <p className="whitespace-nowrap">{dateStr}</p>}
                {transactionId && <p className="font-semibold text-zinc-800 whitespace-nowrap">No: #{transactionId}</p>}
                {customerName && <p className="font-semibold text-zinc-950 whitespace-nowrap">Pelanggan: {customerName}</p>}
              </div>
            ) : (
              <div className={`text-zinc-500 pt-0.5 flex flex-col gap-0.5 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                {dateStr && <p className="whitespace-nowrap">{dateStr}</p>}
                {transactionId && <p className="whitespace-nowrap">No: #{transactionId}</p>}
                {customerName && (
                  <p className="font-semibold text-zinc-800 whitespace-nowrap">
                    Pelanggan: {customerName}
                  </p>
                )}
              </div>
            )}
          </div>

          <div
            ref={listRef}
            data-receipt-items=""
            className={`flex flex-col ${isCompact ? "gap-1 py-0.5" : "gap-1.5 py-1"}`}
            style={maxListHeight ? { maxHeight: maxListHeight, overflowY: "auto" } : undefined}
          >
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <p className="font-semibold text-zinc-950 leading-tight break-words">
                  {item.name}
                </p>
                <div
                  className={`flex justify-between items-center text-zinc-600 ${
                    is80mm ? (isCompact ? "text-[11px]" : "text-xs") : (isCompact ? "text-[10px]" : "text-[11px]")
                  }`}
                >
                  <span className="shrink-0 whitespace-nowrap">
                    {item.qty} x {formatCurrency(item.price)}
                  </span>
                  <span className="font-medium text-zinc-950 text-right shrink-0 pl-2 whitespace-nowrap">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={`flex flex-col ${isCompact ? "border-t border-dashed border-zinc-300 pt-1.5 gap-0.5" : "border-t border-dashed border-zinc-400 pt-2 gap-1"}`}>
            {settings.taxEnabled && subtotal !== undefined && (
              <>
                <div className={`flex justify-between items-center text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                  <span className="whitespace-nowrap">Subtotal</span>
                  <span className="whitespace-nowrap shrink-0">{formatCurrency(subtotal)}</span>
                </div>
                <div className={`flex justify-between items-center text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                  <span className="whitespace-nowrap">Pajak ({settings.taxRate}%)</span>
                  <span className="whitespace-nowrap shrink-0">{formatCurrency(tax)}</span>
                </div>
              </>
            )}

            {isModern ? (
              <div className="bg-zinc-100 border border-zinc-200/80 rounded-md p-2 my-1 text-center flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block whitespace-nowrap">Total Tagihan</span>
                <span className={`font-black text-zinc-950 block whitespace-nowrap ${is80mm ? "text-xl" : "text-lg"}`}>{formatCurrency(total)}</span>
              </div>
            ) : (
              <div
                className={`flex justify-between items-center font-bold text-zinc-950 ${
                  isCompact ? "text-xs font-black py-0.5" : (is80mm ? "text-base py-0.5" : "text-sm py-0.5")
                }`}
              >
                <span className="whitespace-nowrap">TOTAL</span>
                <span className="whitespace-nowrap shrink-0">{formatCurrency(total)}</span>
              </div>
            )}

            <div className={`flex justify-between items-center text-zinc-600 ${isCompact ? "text-[10px]" : (is80mm ? "text-xs" : "text-[11px]")}`}>
              <span className="whitespace-nowrap shrink-0">
                BAYAR ({paymentType === "debt" ? "HUTANG" : "TUNAI"})
              </span>
              <span className="whitespace-nowrap shrink-0">{formatCurrency(payment)}</span>
            </div>
            <div className={`flex justify-between items-center font-bold text-zinc-950 ${isCompact ? "text-[10px]" : (is80mm ? "text-xs" : "text-[11px]")}`}>
              <span className="whitespace-nowrap shrink-0">KEMBALI</span>
              <span className="whitespace-nowrap shrink-0">{formatCurrency(change)}</span>
            </div>
          </div>

          {settings.receiptFooter && (
            <div className={`flex flex-col gap-0.5 ${isCompact ? "border-t border-dashed border-zinc-300 pt-1 text-center text-[10px] text-zinc-500" : "border-t border-dashed border-zinc-400 pt-2 text-center text-[11px] text-zinc-500 font-medium"}`}>
              {isModern && <p className="font-bold tracking-wider text-[10px] text-zinc-600 mb-0.5">** TRANSAKSI BERHASIL **</p>}
              <p>{settings.receiptFooter}</p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

ReceiptPaper.displayName = "ReceiptPaper";

export interface ReceiptProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function Receipt({ transaction, open, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const settings = getStoredSettings();

  useEffect(() => {
    if (open && typeof window !== "undefined" && window.AndroidBridge) {
      setPrinterConnected(isBluetoothPrinterConnected());
    }
  }, [open]);

  if (!transaction) return null;

  const handleConnectPrinter = async () => {
    if (!settings.selectedPrinterMac) return;
    setConnecting(true);
    try {
      const ok = await connectBluetoothPrinter(settings.selectedPrinterMac);
      setPrinterConnected(ok);
      if (ok) {
        toast({
          title: "Printer Terhubung",
          description: `Tersambung ke ${settings.selectedPrinterName || settings.selectedPrinterMac}`,
        });
      } else {
        toast({
          title: "Gagal Menghubungkan",
          description: "Pastikan printer Bluetooth menyala dan berada dalam jangkauan",
          variant: "destructive",
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handlePrint = async () => {
    if (!transaction) return;
    setPrinting(true);

    try {
      const canvas = receiptRef.current ? await renderReceiptCanvas(receiptRef.current) : null;
      await executeThermalPrint({
        settings,
        title: `Struk-${transaction.id.slice(0, 8).toUpperCase()}`,
        docNumber: transaction.id.slice(0, 8).toUpperCase(),
        dateStr: formatDate(transaction.createdAt),
        customerName: transaction.customerName,
        items: transaction.items.map((item) => ({
          name: `${item.product.name} (${item.variant.name})`,
          qty: item.quantity,
          price:
            item.priceType === "wholesale"
              ? item.variant.wholesalePrice
              : item.variant.retailPrice,
          total: item.subtotal,
        })),
        total: transaction.total,
        payment: transaction.payment,
        change: transaction.change,
        canvas,
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleSaveAsPng = async () => {
    if (!transaction || !receiptRef.current) return;
    try {
      const canvas = await renderReceiptCanvas(receiptRef.current);
      if (!canvas) return;
      saveReceiptPng(canvas, `struk-${transaction.id.slice(0, 8).toUpperCase()}.png`);
    } catch {
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan struk",
        variant: "destructive",
      });
    }
  };

  const handleShareReceipt = async () => {
    if (!transaction || !receiptRef.current) return;
    const canvas = await renderReceiptCanvas(receiptRef.current);
    if (!canvas) return;
    await shareReceiptPng(
      canvas,
      `struk-${transaction.id.slice(0, 8).toUpperCase()}.png`,
      `Struk - ${settings.storeName || "WarungPOS"}`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4 sm:p-6 space-y-3">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-bold tracking-tight">Nota Transaksi</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-1">
          <ReceiptPaper
            ref={receiptRef}
            settings={settings}
            transactionId={transaction.id.slice(0, 8).toUpperCase()}
            dateStr={formatDate(transaction.createdAt)}
            customerName={transaction.customerName}
            paymentType={transaction.paymentType === "debt" ? "debt" : "cash"}
            items={transaction.items.map((item) => ({
              name: `${item.product.name} (${item.variant.name})`,
              qty: item.quantity,
              price:
                item.priceType === "wholesale"
                  ? item.variant.wholesalePrice
                  : item.variant.retailPrice,
              total: item.subtotal,
            }))}
            total={transaction.total}
            payment={transaction.payment}
            change={transaction.change}
            maxListHeight="12rem"
          />
        </div>

        {typeof window !== "undefined" && window.AndroidBridge && (
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  printerConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span className="text-muted-foreground shrink-0">Printer:</span>
              <span className="font-medium text-foreground truncate">
                {settings.selectedPrinterName || (settings.selectedPrinterMac ? settings.selectedPrinterMac : "Belum diatur")}
              </span>
            </div>
            {settings.selectedPrinterMac && !printerConnected && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={connecting}
                onClick={handleConnectPrinter}
                className="h-6 px-2 text-[11px] text-primary hover:text-primary font-medium shrink-0"
              >
                {connecting ? "..." : "Sambungkan"}
              </Button>
            )}
            {printerConnected && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                Siap
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            className="h-10 text-xs sm:text-sm font-semibold px-2"
            onClick={handlePrint}
            disabled={printing}
          >
            <Printer className="w-4 h-4 mr-1.5 shrink-0" />
            {printing ? "Mencetak..." : "Cetak"}
          </Button>
          <Button
            variant="default"
            className="h-10 text-xs sm:text-sm font-semibold px-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={handleShareReceipt}
          >
            <Share2 className="w-4 h-4 mr-1.5 shrink-0" />
            Bagikan
          </Button>
          <Button
            variant="outline"
            className="h-10 text-xs sm:text-sm font-semibold px-2"
            onClick={handleSaveAsPng}
          >
            <Download className="w-4 h-4 mr-1.5 shrink-0" />
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ReceiptPreviewProps {
  settings: StoreSettingsData;
}

export function ReceiptPreview({ settings }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const sampleItems: ReceiptItemData[] = [
    { name: "Indomie Goreng", qty: 2, price: 3500, total: 7000 },
    { name: "Teh Botol", qty: 1, price: 5000, total: 5000 },
    { name: "Roti Tawar", qty: 1, price: 15000, total: 15000 },
  ];

  const subtotal = sampleItems.reduce((sum, item) => sum + item.total, 0);
  const tax = settings.taxEnabled
    ? Math.round((subtotal * (settings.taxRate || 0)) / 100)
    : 0;
  const total = subtotal + tax;
  const payment = 50000;
  const change = payment - total;

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleTestPrint = async () => {
    setPrinting(true);
    try {
      const canvas = receiptRef.current ? await renderReceiptCanvas(receiptRef.current) : null;
      await executeThermalPrint({
        settings,
        title: `Test-Print-${(settings.storeName || "WarungPOS").replace(/\s+/g, "-")}`,
        dateStr: currentDate,
        items: sampleItems,
        subtotal,
        tax,
        total,
        payment,
        change,
        canvas,
        isTest: true,
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleSaveAsPng = async () => {
    try {
      if (!receiptRef.current) return;
      const canvas = await renderReceiptCanvas(receiptRef.current);
      if (!canvas) return;
      saveReceiptPng(canvas, `struk-preview-${Date.now()}.png`, true);
    } catch {
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan struk",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    const canvas = await renderReceiptCanvas(receiptRef.current);
    if (!canvas) return;
    await shareReceiptPng(
      canvas,
      `struk-preview-${Date.now()}.png`,
      `Preview Struk - ${settings.storeName || "WarungPOS"}`
    );
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/30 rounded-xl border border-border/50 p-4 sm:p-5 flex justify-center overflow-x-auto">
        <ReceiptPaper
          ref={receiptRef}
          settings={settings}
          transactionId="TRX12345"
          dateStr={currentDate}
          items={sampleItems}
          subtotal={subtotal}
          tax={tax}
          total={total}
          payment={payment}
          change={change}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="default"
          className="h-10 text-xs sm:text-sm font-semibold gap-1.5 px-2"
          onClick={handleTestPrint}
          disabled={printing}
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>{printing ? "..." : "Cetak"}</span>
        </Button>
        <Button
          variant="outline"
          className="h-10 text-xs sm:text-sm font-medium gap-1.5 px-2"
          onClick={handleSaveAsPng}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Simpan</span>
        </Button>
        <Button
          className="h-10 text-xs sm:text-sm font-medium gap-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>Bagikan</span>
        </Button>
      </div>
    </div>
  );
}
