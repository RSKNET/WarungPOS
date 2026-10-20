import { useState, useEffect, useRef, forwardRef } from "react";
import { Transaction } from "@/types/pos";
import { formatDate } from "@/lib/format";
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
  generateReceiptLines,
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
    const lines = generateReceiptLines({
      storeName: settings.storeName,
      storeAddress: settings.storeAddress,
      storePhone: settings.storePhone,
      receiptFooter: settings.receiptFooter,
      dateStr: dateStr || "",
      docNumber: transactionId,
      customerName,
      items,
      subtotal,
      tax,
      total,
      payment,
      change,
      paymentType,
      template: settings.receiptTemplate,
    });

    return (
      <div ref={ref} className="thermal-paper select-none">
        <div
          ref={listRef}
          data-receipt-items=""
          className="receipt-content"
          style={maxListHeight ? { maxHeight: maxListHeight, overflowY: "auto" } : undefined}
        >
          {lines.map((line, idx) => (
            <div
              key={idx}
              className={`rl${line.bold ? " b" : ""}${line.isBig ? " big" : ""}`}
            >
              {line.text || "\u00A0"}
            </div>
          ))}
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
        paymentType: transaction.paymentType === "debt" ? "debt" : "cash",
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
      <DialogContent className="max-w-md max-h-[92vh] flex flex-col p-4 sm:p-5 space-y-3">
        <DialogHeader className="pb-1 shrink-0">
          <DialogTitle className="text-lg font-bold tracking-tight">Nota Transaksi</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[62vh] py-2 flex justify-center bg-zinc-100/60 dark:bg-zinc-900/60 rounded-xl p-3 border border-border/40">
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
        paymentType: "cash",
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
      <div className="bg-zinc-100/60 dark:bg-zinc-900/60 rounded-xl border border-border/40 p-4 sm:p-5 flex justify-center max-h-[70vh] overflow-y-auto">
        <ReceiptPaper
          ref={receiptRef}
          settings={settings}
          transactionId="TRX12345"
          dateStr={currentDate}
          paymentType="cash"
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
