import { toast } from "@/hooks/use-toast";

export interface BluetoothDeviceType {
  name: string;
  mac: string;
  isPrinter: boolean;
  deviceClass: number;
}

interface AndroidBridgeType {
  saveToFolder?: (content: string, filename: string, subFolder: string, mimeType: string) => boolean;
  saveBase64Image?: (base64Data: string, filename: string, subFolder: string) => boolean;
  saveToDownloads?: (content: string, filename: string) => boolean;
  printHtml?: (htmlContent: string, jobName: string) => void;
  shareImage?: (base64Data: string, title?: string) => boolean;
  getPairedPrinters?: (showAll: boolean) => string;
  connectPrinter?: (mac: string) => boolean;
  disconnectPrinter?: () => boolean;
  isPrinterConnected?: () => boolean;
  getConnectedPrinterMac?: () => string;
  printBluetoothImage?: (base64Data: string, paperWidthMm: number) => boolean;
  isBluetoothEnabled?: () => boolean;
  requestEnableBluetooth?: () => void;
  hasBluetoothPermission?: () => boolean;
  requestBluetoothPermission?: () => void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeType;
  }
}

export function printDocument(htmlContent: string, jobName: string = "Dokumen-WarungPOS"): void {
  if (typeof window !== "undefined" && window.AndroidBridge?.printHtml) {
    window.AndroidBridge.printHtml(htmlContent, jobName);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (frameDoc && iframe.contentWindow) {
    frameDoc.open();
    frameDoc.write(htmlContent);
    if (jobName) {
      frameDoc.title = jobName;
    }
    frameDoc.close();

    const cleanup = () => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {}
    };

    iframe.contentWindow.onafterprint = cleanup;

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        cleanup();
        window.print();
      }
      setTimeout(cleanup, 60000);
    }, 250);
  } else {
    window.print();
  }
}

export function saveImageToDevice(dataUrl: string, filename: string, subFolder: string = "Image"): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.saveBase64Image) {
    return window.AndroidBridge.saveBase64Image(dataUrl, filename, subFolder);
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

export async function shareImageFile(
  dataUrl: string,
  filename: string = "struk.png",
  title: string = "Struk Transaksi WarungPOS",
): Promise<boolean> {
  if (typeof window !== "undefined" && window.AndroidBridge?.shareImage) {
    return window.AndroidBridge.shareImage(dataUrl, title);
  }

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: title,
        });
        return true;
      }
    } catch {
      return saveImageToDevice(dataUrl, filename, "Image");
    }
  }

  return saveImageToDevice(dataUrl, filename, "Image");
}

export function saveCsvToDevice(csvContent: string, filename: string, subFolder: string = "CSV"): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.saveToFolder) {
    return window.AndroidBridge.saveToFolder(csvContent, filename, subFolder, "text/csv");
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function getPairedBluetoothPrinters(showAll = false): Promise<BluetoothDeviceType[]> {
  if (typeof window !== "undefined" && window.AndroidBridge?.getPairedPrinters) {
    try {
      const json = window.AndroidBridge.getPairedPrinters(showAll);
      return JSON.parse(json) as BluetoothDeviceType[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function connectBluetoothPrinter(mac: string): Promise<boolean> {
  if (typeof window !== "undefined" && window.AndroidBridge?.connectPrinter) {
    return window.AndroidBridge.connectPrinter(mac);
  }
  return false;
}

export async function disconnectBluetoothPrinter(): Promise<boolean> {
  if (typeof window !== "undefined" && window.AndroidBridge?.disconnectPrinter) {
    return window.AndroidBridge.disconnectPrinter();
  }
  return false;
}

export function isBluetoothPrinterConnected(): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.isPrinterConnected) {
    return window.AndroidBridge.isPrinterConnected();
  }
  return false;
}

export function getConnectedPrinterMac(): string {
  if (typeof window !== "undefined" && window.AndroidBridge?.getConnectedPrinterMac) {
    return window.AndroidBridge.getConnectedPrinterMac();
  }
  return "";
}

export async function printViaBluetooth(dataUrl: string, paperWidthMm: number = 58): Promise<boolean> {
  if (typeof window !== "undefined" && window.AndroidBridge?.printBluetoothImage) {
    return window.AndroidBridge.printBluetoothImage(dataUrl, paperWidthMm);
  }
  return false;
}

export function isBluetoothEnabled(): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.isBluetoothEnabled) {
    return window.AndroidBridge.isBluetoothEnabled();
  }
  return true;
}

export function requestEnableBluetooth(): void {
  if (typeof window !== "undefined" && window.AndroidBridge?.requestEnableBluetooth) {
    window.AndroidBridge.requestEnableBluetooth();
  }
}

export function hasBluetoothPermission(): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.hasBluetoothPermission) {
    return window.AndroidBridge.hasBluetoothPermission();
  }
  return true;
}

export function requestBluetoothPermission(): void {
  if (typeof window !== "undefined" && window.AndroidBridge?.requestBluetoothPermission) {
    window.AndroidBridge.requestBluetoothPermission();
  }
}

export interface SaveCanvasOptions {
  filename: string;
  folder?: "Image" | "Documents";
  toastTitle?: string;
  toastDescription?: string;
}

export function saveCanvasAsImage(canvas: HTMLCanvasElement, options: SaveCanvasOptions): boolean {
  const {
    filename,
    folder = "Image",
    toastTitle = "Gambar Disimpan",
    toastDescription = typeof window !== "undefined" && window.AndroidBridge
      ? "File berhasil disimpan di folder Download"
      : "File berhasil disimpan sebagai gambar PNG",
  } = options;

  const base64Data = canvas.toDataURL("image/png");
  const success = saveImageToDevice(base64Data, filename, folder);

  toast({
    title: toastTitle,
    description: toastDescription,
  });

  return success;
}

export interface ShareCanvasOptions {
  filename: string;
  title: string;
  errorTitle?: string;
  errorDescription?: string;
}

export async function shareCanvasAsImage(canvas: HTMLCanvasElement, options: ShareCanvasOptions): Promise<boolean> {
  const {
    filename,
    title,
    errorTitle = "Gagal Membagikan",
    errorDescription = "Terjadi kesalahan saat membagikan file",
  } = options;

  try {
    const base64Data = canvas.toDataURL("image/png");
    return await shareImageFile(base64Data, filename, title);
  } catch {
    toast({
      title: errorTitle,
      description: errorDescription,
      variant: "destructive",
    });
    return false;
  }
}

