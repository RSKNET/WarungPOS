import html2canvas from "html2canvas";
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
  receiptTemplate?: "compact";
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
  receiptTemplate: "compact",
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
    return await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      logging: false,
      onclone: (_clonedDoc, clonedEl) => {
        clonedEl.style.boxShadow = "none";
        clonedEl.style.transform = "none";
        clonedEl.style.margin = "0";
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

export const RECEIPT_WIDTH = 32;

function cleanString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapLine(text: string, width: number): string[] {
  const words = String(text).split(" ").filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    let w = word;
    while (w.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!w) return;
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= width) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  });
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

export interface ReceiptLine {
  text: string;
  bold?: boolean;
  isBig?: boolean;
}

export class ReceiptBuilder {
  width: number;
  lines: ReceiptLine[];

  constructor(width = RECEIPT_WIDTH) {
    this.width = width;
    this.lines = [];
  }

  feed(n = 1): this {
    for (let i = 0; i < n; i++) {
      this.lines.push({ text: "" });
    }
    return this;
  }

  sep(ch = "-"): this {
    this.lines.push({ text: (ch || "-").repeat(this.width) });
    return this;
  }

  center(text: string, bold = false, isBig = false): this {
    const w = isBig ? Math.floor(this.width / 1.3) : this.width;
    const val = cleanString(text);
    wrapLine(val, w).forEach((line) => {
      const pad = Math.max(0, Math.floor((this.width - line.length) / 2));
      this.lines.push({ text: " ".repeat(pad) + line, bold, isBig });
    });
    return this;
  }

  left(text: string, bold = false): this {
    const val = cleanString(text);
    wrapLine(val, this.width).forEach((line) => {
      this.lines.push({ text: line, bold });
    });
    return this;
  }

  lr(leftText: string, rightText: string, bold = false): this {
    const k = cleanString(leftText);
    const v = cleanString(rightText);
    if (k.length + 1 + v.length <= this.width) {
      const spaces = this.width - k.length - v.length;
      this.lines.push({ text: k + " ".repeat(spaces) + v, bold });
      return this;
    }
    this.lines.push({ text: k, bold });
    wrapLine(v, this.width).forEach((line) => {
      const spaces = Math.max(0, this.width - line.length);
      this.lines.push({ text: " ".repeat(spaces) + line, bold });
    });
    return this;
  }
}

export function generateReceiptLines(payload: {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
  dateStr: string;
  docNumber?: string;
  customerName?: string;
  items: ReceiptItemData[];
  subtotal?: number;
  tax?: number;
  total: number;
  payment: number;
  change: number;
  paymentType?: "cash" | "debt";
  template?: "compact";
  isTest?: boolean;
}): ReceiptLine[] {
  const {
    storeName,
    storeAddress,
    storePhone,
    receiptFooter,
    dateStr,
    docNumber,
    customerName,
    items,
    subtotal,
    tax,
    total,
    payment,
    change,
    paymentType = "cash",
    isTest = false,
  } = payload;

  const rb = new ReceiptBuilder(RECEIPT_WIDTH);

  rb.center(storeName || "WARUNGPOS", true);
  if (storeAddress) rb.center(storeAddress);
  if (storePhone) rb.center(`Telp: ${storePhone}`);

  if (isTest) {
    rb.sep("=");
    rb.center("TEST PRINT (COMPACT)", true);
    rb.sep("=");
  } else {
    rb.sep("=");
  }

  let dateOnly = dateStr;
  let timeOnly = "";
  if (dateStr.includes(",")) {
    const [d, t] = dateStr.split(",");
    dateOnly = d.trim();
    timeOnly = t.trim();
  } else {
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      timeOnly = parts[parts.length - 1];
      dateOnly = parts.slice(0, -1).join(" ");
    }
  }

  rb.lr("TANGGAL", dateOnly);
  if (timeOnly) rb.lr("WAKTU", timeOnly);

  if (docNumber) rb.lr("NO TRANSAKSI", `#${docNumber}`);
  if (customerName) rb.lr("PELANGGAN", customerName);

  rb.sep("-");

  items.forEach((item) => {
    rb.left(item.name, true);
    rb.lr(`${item.qty} x ${formatCurrency(item.price)}`, formatCurrency(item.total));
  });

  if (subtotal !== undefined && tax !== undefined && tax > 0) {
    rb.sep("-");
    rb.lr("SUBTOTAL", formatCurrency(subtotal));
    rb.lr("PAJAK", formatCurrency(tax));
  }

  rb.sep("-");
  rb.lr("TOTAL", formatCurrency(total), true);
  rb.sep("=");
  rb.lr(`BAYAR (${paymentType === "debt" ? "HUTANG" : "TUNAI"})`, formatCurrency(payment));
  rb.lr("KEMBALI", formatCurrency(change), true);
  rb.sep("=");

  rb.feed(1);
  rb.sep("-");
  rb.center("** TRANSAKSI BERHASIL **", true);

  if (receiptFooter) {
    rb.center(receiptFooter);
  }

  return rb.lines;
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
  paymentType?: "cash" | "debt";
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
    subtotal,
    tax,
    total,
    payment,
    change,
    paymentType,
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
      const ok = await printViaBluetooth(canvas.toDataURL("image/png"), 58);
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

  const lines = generateReceiptLines({
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    storePhone: settings.storePhone,
    receiptFooter: settings.receiptFooter,
    dateStr,
    docNumber,
    customerName,
    items,
    subtotal,
    tax,
    total,
    payment,
    change,
    paymentType,
    template: "compact",
    isTest,
  });

  const content = lines
    .map((l) => `<div class="rl${l.bold ? " b" : ""}${l.isBig ? " big" : ""}">${l.text || "&nbsp;"}</div>`)
    .join("");

  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title><style>
@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@600;800;900&display=swap');
@page{size:58mm auto;margin:0;}
@media print{html,body{width:48mm;margin:0 auto;padding:0;}}
body{margin:0 auto;padding:2mm 1mm;width:48mm;background:#fff;}
.receipt-content{font-family:'Inconsolata',monospace;font-size:14.5px;line-height:1.35;width:32ch;white-space:pre;color:#000;font-weight:600;}
.rl{white-space:pre;min-height:1.35em;}
.b{font-weight:800;}
.big{font-size:130%;font-weight:900;text-align:center;}
</style></head><body><div class="receipt-content">${content}</div></body></html>`;

  printDocument(fullHtml, title.replace(/\s+/g, "-"));
}
