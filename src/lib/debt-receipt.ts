import { toCanvas } from "html-to-image";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { printDocument, saveCanvasAsImage, shareCanvasAsImage } from "@/lib/native-bridge";

export interface DebtReceiptStore {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
}

export interface DebtReceiptCustomer {
  customerName: string;
  totalDebt: number;
}

export interface DebtReceiptRow {
  id: string;
  timestamp: string;
  type: "debt" | "payment";
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface DebtReceiptOptions {
  store: DebtReceiptStore;
  customer: DebtReceiptCustomer;
  rows: DebtReceiptRow[];
  dateFrom?: Date;
  dateTo?: Date;
}

export function getStoreReceiptInfo(): DebtReceiptStore {
  const fallback: DebtReceiptStore = {
    storeName: "WarungPOS",
    storeAddress: "",
    storePhone: "",
  };
  try {
    const saved = localStorage.getItem("store-settings");
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return {
      storeName: parsed.storeName || fallback.storeName,
      storeAddress: parsed.storeAddress || fallback.storeAddress,
      storePhone: parsed.storePhone || fallback.storePhone,
    };
  } catch {
    return fallback;
  }
}

export function generateDebtReceiptHtml(options: DebtReceiptOptions): string {
  const { store, customer, rows, dateFrom, dateTo } = options;
  const printDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: localeId });
  const isLunas = customer.totalDebt <= 0;
  const periodeStr = dateFrom
    ? `${format(dateFrom, "dd/MM/yyyy")} - ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Sekarang"}`
    : "Semua Riwayat";

  const sortedRows = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Nota Hutang - ${customer.customerName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 16mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          padding: 0;
          line-height: 1.4;
          font-size: 11px;
        }
        .container {
          width: 100%;
          max-width: 740px;
          margin: 0 auto;
          background: #ffffff;
          padding: 24px;
        }
        @media print {
          body, .container {
            padding: 0 !important;
          }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 2px solid #111827;
          margin-bottom: 14px;
        }
        .store-brand h1 {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.2px;
          text-transform: uppercase;
        }
        .store-brand p {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
        }
        .doc-meta {
          text-align: right;
        }
        .doc-title {
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .doc-meta p {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
        }

        .recipient-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #9ca3af;
          font-size: 11px;
        }
        .recipient-info table td {
          padding: 2px 0;
          border: none;
          font-size: 11px;
          vertical-align: middle;
        }
        .recipient-label {
          width: 90px;
          color: #4b5563;
        }
        .recipient-val {
          font-weight: 700;
          color: #111827;
        }

        table.nota-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        table.nota-table th {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111827;
          padding: 7px 6px;
          border-top: 1.5px solid #111827;
          border-bottom: 1.5px solid #111827;
          text-align: left;
          vertical-align: middle;
        }
        table.nota-table td {
          padding: 6px 6px;
          border-bottom: 1px dotted #d1d5db;
          font-size: 10.5px;
          vertical-align: middle;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .summary-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
          margin-bottom: 24px;
        }
        .summary-box {
          width: 260px;
          border-top: 1.5px solid #111827;
          border-bottom: 3px double #111827;
          padding: 8px 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111827;
        }
        .summary-val {
          font-size: 13px;
          font-weight: 800;
          color: #111827;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding: 0 20px;
        }
        .sig-box {
          text-align: center;
          width: 180px;
        }
        .sig-title {
          font-size: 10.5px;
          color: #4b5563;
          margin-bottom: 50px;
        }
        .sig-name {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          border-top: 1px dotted #9ca3af;
          padding-top: 4px;
        }

        .footer-note {
          text-align: center;
          font-size: 9.5px;
          color: #6b7280;
          margin-top: 24px;
          border-top: 1px dashed #d1d5db;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="store-brand">
            <h1>${store.storeName}</h1>
            ${store.storeAddress ? `<p>${store.storeAddress}</p>` : ""}
            ${store.storePhone ? `<p>Telp: ${store.storePhone}</p>` : ""}
          </div>
          <div class="doc-meta">
            <div class="doc-title">NOTA CATATAN HUTANG</div>
            <p>Tanggal: ${printDate}</p>
          </div>
        </div>

        <div class="recipient-section">
          <table class="recipient-info">
            <tr>
              <td class="recipient-label">Kepada Yth.</td>
              <td>: <span class="recipient-val">${customer.customerName}</span></td>
            </tr>
            <tr>
              <td class="recipient-label">Periode</td>
              <td>: ${periodeStr}</td>
            </tr>
          </table>
          <div style="text-align: right; font-weight: 700; font-size: 11px; color: ${isLunas ? "#16a34a" : "#e11d48"};">
            STATUS: ${isLunas ? "LUNAS" : "BELUM LUNAS"}
          </div>
        </div>

        <table class="nota-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 35px;">No</th>
              <th style="width: 105px;">Tanggal</th>
              <th>Keterangan / Nama Barang</th>
              <th class="text-center" style="width: 50px;">Qty</th>
              <th class="text-right" style="width: 100px;">Harga</th>
              <th class="text-right" style="width: 120px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRows
              .map(
                (row, index) => `
              <tr>
                <td class="text-center" style="color: #6b7280;">${index + 1}</td>
                <td style="color: #4b5563;">${format(new Date(row.timestamp), "dd/MM/yy HH:mm", { locale: localeId })}</td>
                <td style="font-weight: ${row.type === "payment" ? "700" : "500"}; ${row.type === "payment" ? "color: #16a34a;" : ""}">
                  ${row.type === "payment" ? "[BAYAR] Pembayaran Hutang" : row.productName}
                </td>
                <td class="text-center">${row.type === "debt" ? row.quantity : "—"}</td>
                <td class="text-right mono">${row.type === "debt" ? formatCurrency(row.unitPrice || 0) : "—"}</td>
                <td class="text-right mono" style="font-weight: 700; ${row.type === "payment" ? "color: #16a34a;" : ""}">
                  ${row.type === "payment" ? `- ${formatCurrency(Math.abs(row.totalPrice))}` : formatCurrency(row.totalPrice)}
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="summary-box">
            <span class="summary-label">Sisa Hutang:</span>
            <span class="summary-val">${formatCurrency(customer.totalDebt)}</span>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Tanda Terima</div>
            <div class="sig-name">${customer.customerName}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Hormat Kami</div>
            <div class="sig-name">${store.storeName}</div>
          </div>
        </div>

        <div class="footer-note">
          Catatan: Simpan nota ini sebagai bukti catatan hutang piutang yang sah.
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function renderReceiptCanvas(html: string): Promise<HTMLCanvasElement> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  container.style.width = "740px";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const target = (container.querySelector(".container") as HTMLElement) || container;
    return await toCanvas(target, {
      backgroundColor: "#ffffff",
      pixelRatio: 2.5,
      skipFonts: true,
    });
  } finally {
    document.body.removeChild(container);
  }
}

export function printDebtReceipt(options: DebtReceiptOptions): void {
  const html = generateDebtReceiptHtml(options);
  const printDocTitle = `Nota-Hutang-${options.customer.customerName.replace(/\s+/g, "-")}`;
  printDocument(html, printDocTitle);
}

export async function saveDebtReceiptImage(options: DebtReceiptOptions): Promise<boolean> {
  const html = generateDebtReceiptHtml(options);
  const canvas = await renderReceiptCanvas(html);
  const fileName = `hutang-${options.customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
  return saveCanvasAsImage(canvas, {
    filename: fileName,
    folder: "Image",
    toastTitle: "Nota Disimpan",
    toastDescription: typeof window !== "undefined" && window.AndroidBridge
      ? "Nota hutang berhasil disimpan di Download/WarungPOS/Image/"
      : "Nota hutang berhasil disimpan sebagai gambar PNG",
  });
}

export async function shareDebtReceiptImage(options: DebtReceiptOptions): Promise<boolean> {
  const html = generateDebtReceiptHtml(options);
  const canvas = await renderReceiptCanvas(html);
  const fileName = `hutang-${options.customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
  const title = `Nota Catatan Hutang - ${options.customer.customerName} (${options.store.storeName})`;
  return await shareCanvasAsImage(canvas, {
    filename: fileName,
    title,
    errorTitle: "Gagal Membagikan",
    errorDescription: "Terjadi kesalahan saat membagikan nota hutang",
  });
}
