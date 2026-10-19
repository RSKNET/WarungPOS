import { toCanvas } from "html-to-image";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import {
  printDocument,
  isBluetoothPrinterConnected,
  connectBluetoothPrinter,
  printViaBluetooth,
  saveCanvasAsImage,
  shareCanvasAsImage,
} from "@/lib/native-bridge";

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
  taxEnabled?: boolean;
  taxRate?: number;
  paperWidth?: "58" | "80";
  receiptTemplate?: "standard" | "modern" | "compact";
  selectedPrinterMac?: string;
  selectedPrinterName?: string;
}

export const defaultStoreSettings: StoreSettingsData = {
  storeName: "WarungPOS",
  storeAddress: "",
  storePhone: "",
  receiptFooter: "Terima kasih atas kunjungan Anda!",
  taxEnabled: false,
  taxRate: 11,
  paperWidth: "58",
  receiptTemplate: "standard",
  selectedPrinterMac: "",
  selectedPrinterName: "",
};

export function getStoredSettings(): StoreSettingsData {
  try {
    const saved = localStorage.getItem("store-settings");
    if (saved) {
      return { ...defaultStoreSettings, ...JSON.parse(saved) };
    }
  } catch {
    return defaultStoreSettings;
  }
  return defaultStoreSettings;
}

export async function renderReceiptCanvas(element: HTMLElement): Promise<HTMLCanvasElement | null> {
  const listEl = element.querySelector("[data-receipt-items]") as HTMLElement | null;
  const prevMaxH = listEl ? listEl.style.maxHeight : "";
  const prevOverflow = listEl ? listEl.style.overflow : "";

  if (listEl) {
    listEl.style.maxHeight = "none";
    listEl.style.overflow = "visible";
  }

  try {
    return await toCanvas(element, {
      backgroundColor: "#ffffff",
      pixelRatio: 3,
      skipFonts: true,
      style: {
        boxShadow: "none",
        transform: "none",
        margin: "0",
      },
    });
  } finally {
    if (listEl) {
      listEl.style.maxHeight = prevMaxH;
      listEl.style.overflow = prevOverflow;
    }
  }
}

export function saveReceiptPng(canvas: HTMLCanvasElement, filename: string, isPreview = false): void {
  saveCanvasAsImage(canvas, {
    filename,
    folder: "Image",
    toastTitle: isPreview ? "Preview Disimpan" : "Struk Disimpan",
    toastDescription: typeof window !== "undefined" && window.AndroidBridge
      ? "Struk berhasil disimpan di Download/WarungPOS/Image/"
      : "Struk berhasil disimpan sebagai gambar PNG",
  });
}

export async function shareReceiptPng(canvas: HTMLCanvasElement, filename: string, title: string): Promise<void> {
  await shareCanvasAsImage(canvas, {
    filename,
    title,
    errorTitle: "Gagal Membagikan",
    errorDescription: "Terjadi kesalahan saat membagikan struk",
  });
}

export interface ThermalPrintPayload {
  settings: StoreSettingsData;
  title: string;
  docNumber?: string;
  dateStr: string;
  customerName?: string;
  items: ReceiptItemData[];
  subtotal?: number;
  tax?: number;
  total: number;
  payment: number;
  change: number;
  canvas?: HTMLCanvasElement | null;
  isTest?: boolean;
}

export async function executeThermalPrint(payload: ThermalPrintPayload): Promise<void> {
  const {
    settings,
    title,
    docNumber,
    dateStr,
    customerName,
    items,
    total,
    payment,
    change,
    canvas,
    isTest,
  } = payload;

  if (typeof window !== "undefined" && window.AndroidBridge) {
    let connected = isBluetoothPrinterConnected();
    if (!connected && settings.selectedPrinterMac) {
      toast({
        title: "Menghubungkan Printer...",
        description: `Menyambungkan ke ${settings.selectedPrinterName || settings.selectedPrinterMac}`,
      });
      connected = await connectBluetoothPrinter(settings.selectedPrinterMac);
    }

    if (connected && canvas) {
      const paperWidthMm = settings.paperWidth === "80" ? 80 : 58;
      const ok = await printViaBluetooth(canvas.toDataURL("image/png"), paperWidthMm);
      if (ok) {
        toast({
          title: isTest ? "Test Cetak Berhasil" : "Nota Dicetak",
          description: isTest
            ? "Nota preview berhasil dicetak via Bluetooth"
            : "Berhasil mencetak ke printer thermal Bluetooth",
        });
        return;
      }
    }
  }

  const paperWidth = settings.paperWidth === "80" ? "80mm" : "58mm";
  const tmpl = settings.receiptTemplate || "standard";
  const isModern = tmpl === "modern";
  const isCompact = tmpl === "compact";
  const fontSize =
    settings.paperWidth === "80"
      ? { base: 12, small: 10, title: 16 }
      : { base: 10, small: 8, title: 14 };

  const totalSection = isModern ? `
    <div style="border-top: 1px dashed #333; padding-top: 6px; margin-bottom: 6px;">
      <div style="text-align: center; border: 1px solid #444; padding: 6px 4px; margin: 6px 0; background-color: #fafafa;">
        <p style="margin: 0; font-size: ${fontSize.small}px; font-weight: bold; letter-spacing: 0.5px;">TOTAL TAGIHAN</p>
        <p style="margin: 2px 0 0; font-size: ${fontSize.title + 2}px; font-weight: 900;">${formatCurrency(total)}</p>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px; margin-bottom: 2px;">
        <span>Bayar</span>
        <span>${formatCurrency(payment)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px;">
        <span>Kembali</span>
        <span style="font-weight: bold;">${formatCurrency(change)}</span>
      </div>
    </div>
  ` : `
    <div style="border-top: ${isCompact ? "1px dashed #333" : "2px solid #333"}; padding-top: ${isCompact ? "4px" : "6px"}; margin-bottom: ${isCompact ? "4px" : "6px"};">
      <div style="display: flex; justify-content: space-between; font-size: ${isCompact ? fontSize.base : fontSize.base + 2}px; font-weight: bold; margin-bottom: 4px;">
        <span>TOTAL</span>
        <span>${formatCurrency(total)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px; margin-bottom: 2px;">
        <span>Bayar</span>
        <span>${formatCurrency(payment)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px;">
        <span>Kembali</span>
        <span style="font-weight: bold;">${formatCurrency(change)}</span>
      </div>
    </div>
  `;

  const printContent = `
    <div style="font-family: 'Inconsolata', 'Courier New', Courier, monospace; width: ${paperWidth}; margin: 0; padding: ${isCompact ? "1.5mm" : "3mm"};">
      <div style="text-align: center; border-bottom: 1px dashed #333; padding-bottom: ${isCompact ? "4px" : "8px"}; margin-bottom: ${isCompact ? "4px" : "8px"};">
        <h2 style="margin: 0; font-size: ${fontSize.title}px; font-weight: bold; letter-spacing: 0.5px;">${settings.storeName || "WarungPOS"}</h2>
        ${isTest ? `<p style="margin: 4px 0 0; font-size: ${fontSize.small}px;">--- TEST PRINT (${tmpl.toUpperCase()}) ---</p>` : `
          ${settings.storeAddress ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">${settings.storeAddress}</p>` : ""}
          ${settings.storePhone ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">Telp: ${settings.storePhone}</p>` : ""}
          <p style="margin: 4px 0 0; font-size: ${fontSize.small}px;">${dateStr}</p>
          ${docNumber ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">No: ${docNumber}</p>` : ""}
          ${customerName ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">Pelanggan: ${customerName}</p>` : ""}
        `}
      </div>

      <div style="margin-bottom: ${isCompact ? "4px" : "8px"};">
        ${items
          .map(
            (item) => `
          <div style="margin-bottom: ${isCompact ? "3px" : "5px"};">
            <p style="margin: 0; font-size: ${fontSize.base}px; font-weight: bold;">${item.name}</p>
            <div style="display: flex; justify-content: space-between; font-size: ${fontSize.small}px;">
              <span>${item.qty} x ${formatCurrency(item.price)}</span>
              <span style="font-weight: bold;">${formatCurrency(item.total)}</span>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>

      ${totalSection}

      <div style="text-align: center; border-top: 1px dashed #333; padding-top: ${isCompact ? "4px" : "8px"};">
        ${isModern && !isTest ? `<p style="margin: 0 0 2px; font-size: 8px; font-weight: bold;">** TRANSAKSI BERHASIL **</p>` : ""}
        <p style="margin: 0; font-size: ${fontSize.small}px;">${settings.receiptFooter || "Terima kasih!"}</p>
      </div>
    </div>
  `;

  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title><style>@page{size:${paperWidth} auto;margin:0;}@media print{html,body{width:${paperWidth};margin:0;padding:0;}}body{margin:0;padding:0;width:${paperWidth};}*{box-sizing:border-box;}</style></head><body>${printContent}</body></html>`;

  printDocument(fullHtml, title.replace(/\s+/g, "-"));
}
