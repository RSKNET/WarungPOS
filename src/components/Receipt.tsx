import { useRef, forwardRef } from "react";
import html2canvas from "html2canvas";
import { Transaction } from "@/types/pos";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { printDocument, saveImageToDevice } from "@/lib/native-bridge";

export interface ReceiptItemData {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface StoreSettingsData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
  showLogo?: boolean;
  taxEnabled?: boolean;
  taxRate?: number;
  paperWidth?: "58" | "80";
}

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

    return (
      <div
        ref={ref}
        className={`bg-white text-zinc-900 shadow-sm border border-zinc-300 rounded-sm select-none ${
          is80mm ? "w-[280px] sm:w-[290px]" : "w-[220px] sm:w-[240px]"
        }`}
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <div className={`p-3.5 ${is80mm ? "text-sm" : "text-xs"} space-y-2`}>
          {/* Header */}
          <div className="text-center pb-2.5 border-b border-dashed border-zinc-400 space-y-0.5">
            <h3
              className={`font-bold tracking-wider uppercase text-zinc-950 ${
                is80mm ? "text-base" : "text-sm"
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
            <div className={`text-zinc-500 pt-1 ${is80mm ? "text-xs" : "text-[10px]"}`}>
              {dateStr && <p>{dateStr}</p>}
              {transactionId && <p>No: #{transactionId}</p>}
              {customerName && (
                <p className="font-semibold text-zinc-800">
                  Pelanggan: {customerName}
                </p>
              )}
            </div>
          </div>

          {/* Item List */}
          <div
            ref={listRef}
            data-receipt-items=""
            className="space-y-1 py-1"
            style={maxListHeight ? { maxHeight: maxListHeight, overflowY: "auto" } : undefined}
          >
            {items.map((item, idx) => (
              <div key={idx} className={is80mm ? "text-xs mb-1" : "text-xs mb-0.5"}>
                <p className="font-semibold text-zinc-950 leading-tight break-words">
                  {item.name}
                </p>
                <div
                  className={`flex justify-between text-zinc-600 ${
                    is80mm ? "text-xs" : "text-[11px]"
                  }`}
                >
                  <span>
                    {item.qty} x {formatCurrency(item.price)}
                  </span>
                  <span className="font-medium text-zinc-950">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1">
            {settings.taxEnabled && subtotal !== undefined && (
              <>
                <div className={`flex justify-between text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className={`flex justify-between text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
                  <span>Pajak ({settings.taxRate}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              </>
            )}
            <div
              className={`flex justify-between font-bold text-zinc-950 ${
                is80mm ? "text-base" : "text-sm"
              }`}
            >
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className={`flex justify-between text-zinc-600 ${is80mm ? "text-xs" : "text-[11px]"}`}>
              <span>
                BAYAR ({paymentType === "debt" ? "HUTANG" : "TUNAI"})
              </span>
              <span>{formatCurrency(payment)}</span>
            </div>
            <div className={`flex justify-between font-bold text-zinc-950 ${is80mm ? "text-xs" : "text-[11px]"}`}>
              <span>KEMBALI</span>
              <span>{formatCurrency(change)}</span>
            </div>
          </div>

          {/* Footer */}
          {settings.receiptFooter && (
            <div className="border-t border-dashed border-zinc-400 pt-2 text-center text-[10px] text-zinc-500">
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

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  showLogo: boolean;
  taxEnabled: boolean;
  taxRate: number;
  paperWidth: "58" | "80";
}

const defaultSettings: StoreSettings = {
  storeName: "WarungPOS",
  storeAddress: "",
  storePhone: "",
  receiptFooter: "Terima kasih atas kunjungan Anda!",
  showLogo: true,
  taxEnabled: false,
  taxRate: 11,
  paperWidth: "58",
};

function getSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem("store-settings");
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {
    return defaultSettings;
  }
  return defaultSettings;
}

export function Receipt({ transaction, open, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const settings = getSettings();
  const paperWidth = settings.paperWidth === "80" ? "80mm" : "58mm";
  const fontSize =
    settings.paperWidth === "80"
      ? { base: 12, small: 10, title: 16 }
      : { base: 10, small: 8, title: 14 };

  const handlePrint = () => {
    const printContent = `
      <div style="font-family: 'Courier New', monospace; width: ${paperWidth}; margin: 0; padding: 3mm;">
        <div style="text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: ${fontSize.title}px; font-weight: bold;">${settings.storeName}</h2>
          ${settings.storeAddress ? `<p style="margin: 3px 0 0; font-size: ${fontSize.small}px;">${settings.storeAddress}</p>` : ""}
          ${settings.storePhone ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">Telp: ${settings.storePhone}</p>` : ""}
          <p style="margin: 5px 0 0; font-size: ${fontSize.small}px;">${formatDate(transaction.createdAt)}</p>
          <p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">No: ${transaction.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div style="margin-bottom: 8px;">
          ${transaction.items
            .map(
              (item) => `
            <div style="margin-bottom: 5px;">
              <p style="margin: 0; font-size: ${fontSize.base}px; font-weight: bold;">${item.product.name} (${item.variant.name})</p>
              <div style="display: flex; justify-content: space-between; font-size: ${fontSize.small}px;">
                <span>${item.quantity} x ${formatCurrency(item.priceType === "wholesale" ? item.variant.wholesalePrice : item.variant.retailPrice)}</span>
                <span style="font-weight: bold;">${formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>

        <div style="border-top: 1px dashed #333; padding-top: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base + 2}px; font-weight: bold; margin-bottom: 4px;">
            <span>TOTAL</span>
            <span>${formatCurrency(transaction.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px; margin-bottom: 2px;">
            <span>Bayar</span>
            <span>${formatCurrency(transaction.payment)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px;">
            <span>Kembali</span>
            <span style="font-weight: bold;">${formatCurrency(transaction.change)}</span>
          </div>
        </div>

        <div style="text-align: center; border-top: 1px dashed #333; padding-top: 8px;">
          <p style="margin: 0; font-size: ${fontSize.small}px;">${settings.receiptFooter}</p>
        </div>
      </div>
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${transaction.id.slice(0, 8).toUpperCase()}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            @media print {
              html, body {
                width: ${paperWidth};
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 0;
              padding: 0;
              width: ${paperWidth};
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `;

    printDocument(fullHtml, `Struk-${transaction.id.slice(0, 8).toUpperCase()}`);
  };

  const handleSaveAsPng = async () => {
    if (!receiptRef.current) return;

    const listEl = receiptRef.current.querySelector(
      "[data-receipt-items]",
    ) as HTMLElement | null;
    const prevMaxH = listEl ? listEl.style.maxHeight : "";
    const prevOverflow = listEl ? listEl.style.overflow : "";

    if (listEl) {
      listEl.style.maxHeight = "none";
      listEl.style.overflow = "visible";
    }

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
      });

      const filename = `struk-${transaction.id.slice(0, 8).toUpperCase()}.png`;
      saveImageToDevice(canvas.toDataURL("image/png"), filename, "Image");

      toast({
        title: "Struk Disimpan",
        description: window.AndroidBridge
          ? "Struk berhasil disimpan di Download/WarungPOS/Image/"
          : "Struk berhasil disimpan sebagai gambar PNG",
      });
    } catch (error) {
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan struk",
        variant: "destructive",
      });
    } finally {
      if (listEl) {
        listEl.style.maxHeight = prevMaxH;
        listEl.style.overflow = prevOverflow;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4 sm:p-6">
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

        <div className="flex gap-2.5 pt-2">
          <Button
            className="flex-1 h-10 text-sm font-medium"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 text-sm font-medium"
            onClick={handleSaveAsPng}
          >
            <Download className="w-4 h-4 mr-2" />
            Simpan PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

