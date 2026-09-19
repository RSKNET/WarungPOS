interface AndroidBridgeType {
  saveToFolder?: (content: string, filename: string, subFolder: string, mimeType: string) => boolean;
  saveBase64Image?: (base64Data: string, filename: string, subFolder: string) => boolean;
  saveToDownloads?: (content: string, filename: string) => boolean;
  printHtml?: (htmlContent: string, jobName: string) => void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeType;
  }
}

/**
 * Cetak dokumen HTML.
 * Di APK: Memakai Android PrintManager resmi (bisa ke printer thermal atau simpan PDF).
 * Di Web: Memakai window.open() & window.print() browser.
 */
export function printDocument(htmlContent: string, jobName: string = "Dokumen-WarungPOS"): void {
  if (typeof window !== "undefined" && window.AndroidBridge?.printHtml) {
    window.AndroidBridge.printHtml(htmlContent, jobName);
    return;
  }

  // Web browser fallback
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  } else {
    window.print();
  }
}

/**
 * Simpan gambar (Base64 / Data URL) ke penyimpanan HP.
 * Di APK: Disimpan ke Download/WarungPOS/Image/ dan terdaftar di Galeri HP.
 * Di Web: Menggunakan tag <a> download.
 */
export function saveImageToDevice(dataUrl: string, filename: string, subFolder: string = "Image"): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.saveBase64Image) {
    return window.AndroidBridge.saveBase64Image(dataUrl, filename, subFolder);
  }

  // Web browser fallback
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * Simpan teks CSV ke penyimpanan HP.
 * Di APK: Disimpan ke Download/WarungPOS/CSV/.
 * Di Web: Menggunakan blob URL & tag <a> download.
 */
export function saveCsvToDevice(csvContent: string, filename: string, subFolder: string = "CSV"): boolean {
  if (typeof window !== "undefined" && window.AndroidBridge?.saveToFolder) {
    return window.AndroidBridge.saveToFolder(csvContent, filename, subFolder, "text/csv");
  }

  // Web browser fallback
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
