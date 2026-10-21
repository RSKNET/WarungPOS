import { toCanvas } from "html-to-image";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { printDocument, saveCanvasAsImage, shareCanvasAsImage } from "@/lib/native-bridge";
import { ShoppingItem, ShoppingCategory } from "@/types/shopping-list";

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

const statementBaseStyles = `
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
  .page-break {
    page-break-after: always;
    break-after: page;
  }
  @media print {
    body, .container {
      padding: 0 !important;
    }
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
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
`;

function renderStatementBody(options: StatementDocumentOptions): string {
  const { store, meta, party, columns, rows, summaries = [], signatures = [], footerNote } = options;

  const dateValue = meta.date
    ? typeof meta.date === "string"
      ? new Date(meta.date)
      : meta.date
    : new Date();

  const printDate = format(dateValue, "dd/MM/yyyy HH:mm", { locale: localeId });

  return `
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
  `;
}

export function generateStatementHtml(options: StatementDocumentOptions): string {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${options.meta.title}</title>
      <style>${statementBaseStyles}</style>
    </head>
    <body>
      <div class="container">
        ${renderStatementBody(options)}
      </div>
    </body>
    </html>
  `;
}

export function generateMultiStatementHtml(optionsList: StatementDocumentOptions[], docTitle?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${docTitle || "Dokumen-WarungPOS"}</title>
      <style>${statementBaseStyles}</style>
    </head>
    <body>
      ${optionsList
        .map((options, index) => {
          const isLast = index === optionsList.length - 1;
          return `
            <div class="container ${!isLast ? "page-break" : ""}">
              ${renderStatementBody(options)}
            </div>
          `;
        })
        .join("")}
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

export function printMultipleStatementDocuments(
  optionsList: StatementDocumentOptions[],
  docTitle?: string,
): void {
  if (optionsList.length === 0) return;
  if (optionsList.length === 1) {
    printStatementDocument(optionsList[0], docTitle);
    return;
  }
  const html = generateMultiStatementHtml(optionsList, docTitle);
  const title = docTitle || "Nota-Catatan-Hutang";
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

export async function saveMultipleStatementImages(
  items: { options: StatementDocumentOptions; filename: string }[],
  config?: SaveStatementImageConfig,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ok = await saveStatementImage(item.options, {
      ...config,
      filename: item.filename,
    });
    if (ok) count++;
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return count;
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

export async function shareMultipleStatementImages(
  items: { options: StatementDocumentOptions; filename: string }[],
  title?: string,
): Promise<boolean> {
  if (items.length === 0) return false;
  if (items.length === 1) {
    return shareStatementImage(items[0].options, {
      filename: items[0].filename,
      title: title || items[0].options.meta.title,
    });
  }

  const files: File[] = [];
  for (const item of items) {
    const html = generateStatementHtml(item.options);
    const canvas = await renderStatementCanvas(html);
    const dataUrl = canvas.toDataURL("image/png");
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    files.push(new File([blob], item.filename, { type: "image/png" }));
  }

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({
        files,
        title: title || "Nota Catatan Hutang",
      });
      return true;
    } catch {
    }
  }

  for (let i = 0; i < items.length; i++) {
    await saveStatementImage(items[i].options, {
      filename: items[i].filename,
    });
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return true;
}

export function generateShoppingListHtml(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
  selectedCategoryIds?: string[],
): string {
  const store = getStoreReceiptInfo();
  const now = format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId });

  const targetCategories = categories.filter((c) => {
    if (selectedCategoryIds && selectedCategoryIds.length > 0) {
      return selectedCategoryIds.includes(c.id);
    }
    return items.some((i) => i.categoryId === c.id);
  });

  const categoriesHtml = (targetCategories.length > 0 ? targetCategories : categories)
    .map((category) => {
      const categoryItems = items.filter((i) => i.categoryId === category.id);
      if (categoryItems.length === 0) return "";

      const rowsHtml = categoryItems
        .map(
          (item, i) => `
        <tr>
          <td class="col-check">
            <div class="box ${item.isPurchased ? "checked" : ""}">
              ${item.isPurchased ? "✓" : ""}
            </div>
          </td>
          <td class="col-no">${i + 1}</td>
          <td class="col-product ${item.isPurchased ? "purchased" : ""}">${item.productName}</td>
          <td class="col-brand">${item.brand || "—"}</td>
          <td class="col-qty">${item.quantity} ${item.unit}</td>
        </tr>
      `,
        )
        .join("");

      return `
        <div class="category-page">
          <div class="header">
            <div class="header-left">
              <h1>DAFTAR BELANJA</h1>
              <div class="category-name">${category.name}</div>
            </div>
            <div class="header-right">
              <div class="date">${now}</div>
              <div class="summary">${categoryItems.length} item</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="col-check"></th>
                <th class="col-no">No</th>
                <th>Produk</th>
                <th style="width: 25%;">Merk</th>
                <th style="width: 100px; text-align: right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <span>${store.storeName}</span>
            <span>Kategori: ${category.name} • ${categoryItems.length} item</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Daftar Belanja - ${now}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 10pt;
          line-height: 1.4;
        }
        .container {
          width: 100%;
          max-width: 740px;
          margin: 0 auto;
          background: #ffffff;
          padding: 24px;
        }
        .category-page {
          page-break-after: always;
          margin-bottom: 28px;
        }
        .category-page:last-child {
          page-break-after: avoid;
          margin-bottom: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 12px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 16px;
        }
        .header-left h1 {
          font-size: 18pt;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0 0 2px 0;
          color: #0f172a;
          text-transform: uppercase;
        }
        .header-left .category-name {
          font-size: 12pt;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-right {
          text-align: right;
        }
        .header-right .date {
          font-size: 9.5pt;
          font-weight: 600;
          color: #1e293b;
        }
        .header-right .summary {
          font-size: 8.5pt;
          color: #64748b;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          text-align: left;
          padding: 8px 6px;
          border-bottom: 1.5px solid #cbd5e1;
        }
        td {
          padding: 8px 6px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 9.5pt;
          vertical-align: middle;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .col-check {
          width: 28px;
          text-align: center;
        }
        .col-no {
          width: 32px;
          color: #64748b;
          font-size: 8.5pt;
        }
        .col-product {
          font-weight: 600;
          color: #0f172a;
        }
        .col-product.purchased {
          text-decoration: line-through;
          color: #94a3b8;
        }
        .col-brand {
          color: #475569;
        }
        .col-qty {
          text-align: right;
          font-weight: 700;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
        }
        .box {
          width: 14px;
          height: 14px;
          border: 1.5px solid #64748b;
          border-radius: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9pt;
          line-height: 1;
        }
        .box.checked {
          background-color: #0f172a;
          border-color: #0f172a;
          color: #ffffff;
        }
        .footer {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 8pt;
          color: #94a3b8;
        }
        @media print {
          body {
            font-size: 9pt;
          }
          .container {
            padding: 0;
            max-width: none;
          }
          .category-page {
            page-break-after: always !important;
            margin-bottom: 0;
          }
          .category-page:last-child {
            page-break-after: avoid !important;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          .box.checked {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${categoriesHtml}
      </div>
    </body>
    </html>
  `;
}

export function exportShoppingListPdf(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
  selectedCategoryIds?: string[],
): void {
  const html = generateShoppingListHtml(items, categories, selectedCategoryIds);
  const now = format(new Date(), "yyyyMMdd-HHmm");
  printDocument(html, `Daftar-Belanja-${now}`);
}

export async function saveShoppingListImage(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
  selectedCategoryIds?: string[],
): Promise<boolean> {
  const targetCategories = categories.filter((c) => {
    if (selectedCategoryIds && selectedCategoryIds.length > 0) {
      return selectedCategoryIds.includes(c.id);
    }
    return items.some((i) => i.categoryId === c.id);
  });

  if (targetCategories.length === 0) return false;

  const nowStr = format(new Date(), "yyyyMMdd-HHmmss");
  for (let i = 0; i < targetCategories.length; i++) {
    const cat = targetCategories[i];
    const catItems = items.filter((item) => item.categoryId === cat.id);
    if (catItems.length === 0) continue;

    const html = generateShoppingListHtml(catItems, [cat]);
    const canvas = await renderStatementCanvas(html);
    const catSlug = cat.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    const fileName = `daftar-belanja-${catSlug}-${nowStr}.png`;

    saveCanvasAsImage(canvas, {
      filename: fileName,
      folder: "Image",
      toastTitle: "Daftar Belanja Disimpan",
      toastDescription:
        typeof window !== "undefined" && window.AndroidBridge
          ? `Kategori ${cat.name} disimpan di Download/WarungPOS/Image/`
          : `Kategori ${cat.name} disimpan sebagai gambar`,
    });

    if (i < targetCategories.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return true;
}

export async function shareShoppingListImage(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
  selectedCategoryIds?: string[],
): Promise<boolean> {
  const targetCategories = categories.filter((c) => {
    if (selectedCategoryIds && selectedCategoryIds.length > 0) {
      return selectedCategoryIds.includes(c.id);
    }
    return items.some((i) => i.categoryId === c.id);
  });

  if (targetCategories.length === 0) return false;

  const nowStr = format(new Date(), "yyyyMMdd-HHmmss");
  const dateFormatted = format(new Date(), "dd MMMM yyyy", { locale: localeId });

  if (targetCategories.length === 1) {
    const cat = targetCategories[0];
    const catItems = items.filter((item) => item.categoryId === cat.id);
    const html = generateShoppingListHtml(catItems, [cat]);
    const canvas = await renderStatementCanvas(html);
    const catSlug = cat.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    const fileName = `daftar-belanja-${catSlug}-${nowStr}.png`;
    return await shareCanvasAsImage(canvas, {
      filename: fileName,
      title: `Daftar Belanja - ${cat.name} (${dateFormatted})`,
      errorTitle: "Gagal Membagikan",
      errorDescription: "Terjadi kesalahan saat membagikan daftar belanja",
    });
  }

  const files: File[] = [];
  for (const cat of targetCategories) {
    const catItems = items.filter((item) => item.categoryId === cat.id);
    if (catItems.length === 0) continue;
    const html = generateShoppingListHtml(catItems, [cat]);
    const canvas = await renderStatementCanvas(html);
    const dataUrl = canvas.toDataURL("image/png");
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const catSlug = cat.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    const fileName = `daftar-belanja-${catSlug}-${nowStr}.png`;
    files.push(new File([blob], fileName, { type: "image/png" }));
  }

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({
        files,
        title: `Daftar Belanja (${targetCategories.length} Kategori) - ${dateFormatted}`,
      });
      return true;
    } catch {
    }
  }

  for (let i = 0; i < targetCategories.length; i++) {
    const cat = targetCategories[i];
    const catItems = items.filter((item) => item.categoryId === cat.id);
    if (catItems.length === 0) continue;
    const html = generateShoppingListHtml(catItems, [cat]);
    const canvas = await renderStatementCanvas(html);
    const catSlug = cat.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    const fileName = `daftar-belanja-${catSlug}-${nowStr}.png`;
    saveCanvasAsImage(canvas, {
      filename: fileName,
      folder: "Image",
    });
    if (i < targetCategories.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return true;
}


