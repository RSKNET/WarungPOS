import { toCanvas } from "html-to-image";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { printDocument, saveCanvasAsImage, shareCanvasAsImage } from "@/lib/native-bridge";

export interface StatementStoreInfo {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
}

export interface StatementMetaInfo {
  title: string;
  documentNumber?: string;
  date?: string | Date;
}

export interface StatementPartyItem {
  label: string;
  value: string;
}

export interface StatementPartyInfo {
  items: StatementPartyItem[];
  badge?: {
    label: string;
    value: string;
    color?: string;
  };
}

export interface StatementColumn {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  isMono?: boolean;
}

export interface StatementCellConfig {
  value: string | number;
  style?: string;
  className?: string;
  isMono?: boolean;
}

export type StatementCell = string | number | undefined | null | StatementCellConfig;

export interface StatementRow {
  id?: string;
  cells: Record<string, StatementCell>;
  rowStyle?: string;
}

export interface StatementSummaryItem {
  label: string;
  value: string | number;
  isHighlight?: boolean;
}

export interface StatementSignature {
  title: string;
  name: string;
}

export interface StatementDocumentOptions {
  store: StatementStoreInfo;
  meta: StatementMetaInfo;
  party: StatementPartyInfo;
  columns: StatementColumn[];
  rows: StatementRow[];
  summaries?: StatementSummaryItem[];
  signatures?: StatementSignature[];
  footerNote?: string;
}

export interface SaveStatementImageConfig {
  filename?: string;
  folder?: "Image" | "Documents";
  toastTitle?: string;
  toastDescription?: string;
}

export interface ShareStatementImageConfig {
  filename?: string;
  title?: string;
  errorTitle?: string;
  errorDescription?: string;
}

export function getStoreReceiptInfo(): StatementStoreInfo {
  const fallback: StatementStoreInfo = {
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

export function generateStatementHtml(options: StatementDocumentOptions): string {
  const { store, meta, party, columns, rows, summaries = [], signatures = [], footerNote } = options;

  const dateValue = meta.date
    ? typeof meta.date === "string"
      ? new Date(meta.date)
      : meta.date
    : new Date();

  const printDate = format(dateValue, "dd/MM/yyyy HH:mm", { locale: localeId });

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${meta.title}</title>
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

        table.statement-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        table.statement-table th {
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
        table.statement-table td {
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
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
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
            <div class="doc-title">${meta.title}</div>
            <p>Tanggal: ${printDate}</p>
            ${meta.documentNumber ? `<p>No: ${meta.documentNumber}</p>` : ""}
          </div>
        </div>

        <div class="recipient-section">
          <table class="recipient-info">
            ${party.items
              .map(
                (item) => `
              <tr>
                <td class="recipient-label">${item.label}</td>
                <td>: <span class="recipient-val">${item.value}</span></td>
              </tr>
            `,
              )
              .join("")}
          </table>
          ${
            party.badge
              ? `
            <div style="text-align: right; font-weight: 700; font-size: 11px; color: ${party.badge.color || "#111827"};">
              ${party.badge.label}: ${party.badge.value}
            </div>
          `
              : ""
          }
        </div>

        <table class="statement-table">
          <thead>
            <tr>
              ${columns
                .map((col) => {
                  const alignClass = col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "";
                  const widthStyle = col.width ? `style="width: ${col.width};"` : "";
                  return `<th class="${alignClass}" ${widthStyle}>${col.header}</th>`;
                })
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => {
                return `
                <tr ${row.rowStyle ? `style="${row.rowStyle}"` : ""}>
                  ${columns
                    .map((col) => {
                      const rawCell = row.cells[col.key];
                      const isObj = typeof rawCell === "object" && rawCell !== null;
                      const text = isObj ? (rawCell as StatementCellConfig).value : rawCell ?? "—";
                      const customStyle = isObj ? (rawCell as StatementCellConfig).style : undefined;
                      const customClass = isObj ? (rawCell as StatementCellConfig).className : undefined;
                      const isMono = isObj ? (rawCell as StatementCellConfig).isMono ?? col.isMono : col.isMono;

                      const classes = [
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "",
                        isMono ? "mono" : "",
                        customClass || "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return `<td class="${classes}" ${customStyle ? `style="${customStyle}"` : ""}>${text}</td>`;
                    })
                    .join("")}
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

        ${
          summaries.length > 0
            ? `
          <div class="summary-container">
            ${summaries
              .map(
                (s) => `
              <div class="summary-box">
                <span class="summary-label">${s.label}</span>
                <span class="summary-val">${s.value}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }

        ${
          signatures.length > 0
            ? `
          <div class="signatures">
            ${signatures
              .map(
                (sig) => `
              <div class="sig-box">
                <div class="sig-title">${sig.title}</div>
                <div class="sig-name">${sig.name}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }

        ${
          footerNote
            ? `
          <div class="footer-note">
            ${footerNote}
          </div>
        `
            : ""
        }
      </div>
    </body>
    </html>
  `;
}

export async function renderStatementCanvas(html: string): Promise<HTMLCanvasElement> {
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

export function printStatementDocument(options: StatementDocumentOptions, docTitle?: string): void {
  const html = generateStatementHtml(options);
  const title = docTitle || options.meta.title.replace(/\s+/g, "-");
  printDocument(html, title);
}

export async function saveStatementImage(
  options: StatementDocumentOptions,
  config?: SaveStatementImageConfig,
): Promise<boolean> {
  const html = generateStatementHtml(options);
  const canvas = await renderStatementCanvas(html);
  const defaultFileName = `dokumen-${format(new Date(), "yyyyMMdd-HHmmss")}.png`;
  return saveCanvasAsImage(canvas, {
    filename: config?.filename || defaultFileName,
    folder: config?.folder || "Image",
    toastTitle: config?.toastTitle || "Dokumen Disimpan",
    toastDescription:
      config?.toastDescription ||
      (typeof window !== "undefined" && window.AndroidBridge
        ? "Dokumen berhasil disimpan di Download/WarungPOS/Image/"
        : "Dokumen berhasil disimpan sebagai gambar PNG"),
  });
}

export async function shareStatementImage(
  options: StatementDocumentOptions,
  config?: ShareStatementImageConfig,
): Promise<boolean> {
  const html = generateStatementHtml(options);
  const canvas = await renderStatementCanvas(html);
  const defaultFileName = `dokumen-${format(new Date(), "yyyyMMdd-HHmmss")}.png`;
  return await shareCanvasAsImage(canvas, {
    filename: config?.filename || defaultFileName,
    title: config?.title || options.meta.title,
    errorTitle: config?.errorTitle || "Gagal Membagikan",
    errorDescription: config?.errorDescription || "Terjadi kesalahan saat membagikan dokumen",
  });
}
