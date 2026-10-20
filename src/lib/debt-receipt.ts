import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import {
  StatementStoreInfo,
  StatementDocumentOptions,
  generateStatementHtml,
  printStatementDocument,
  saveStatementImage,
  shareStatementImage,
  renderStatementCanvas,
  getStoreReceiptInfo,
} from "@/lib/statement-document";

export type DebtReceiptStore = StatementStoreInfo;

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

export { getStoreReceiptInfo, renderStatementCanvas as renderReceiptCanvas };

export function buildDebtStatementOptions(options: DebtReceiptOptions): StatementDocumentOptions {
  const { store, customer, rows, dateFrom, dateTo } = options;
  const isLunas = customer.totalDebt <= 0;
  const periodeStr = dateFrom
    ? `${format(dateFrom, "dd/MM/yyyy")} - ${dateTo ? format(dateTo, "dd/MM/yyyy") : "Sekarang"}`
    : "Semua Riwayat";

  const sortedRows = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return {
    store,
    meta: {
      title: "NOTA CATATAN HUTANG",
      date: new Date(),
    },
    party: {
      items: [
        { label: "Kepada Yth.", value: customer.customerName },
        { label: "Periode", value: periodeStr },
      ],
      badge: {
        label: "STATUS",
        value: isLunas ? "LUNAS" : "BELUM LUNAS",
        color: isLunas ? "#16a34a" : "#e11d48",
      },
    },
    columns: [
      { key: "no", header: "No", align: "center", width: "35px" },
      { key: "date", header: "Tanggal", width: "105px" },
      { key: "description", header: "Keterangan / Nama Barang" },
      { key: "quantity", header: "Qty", align: "center", width: "50px" },
      { key: "price", header: "Harga", align: "right", width: "100px", isMono: true },
      { key: "amount", header: "Jumlah", align: "right", width: "120px", isMono: true },
    ],
    rows: sortedRows.map((row, index) => {
      const isPayment = row.type === "payment";
      return {
        id: row.id,
        cells: {
          no: { value: index + 1, style: "color: #6b7280;" },
          date: {
            value: format(new Date(row.timestamp), "dd/MM/yy HH:mm", { locale: localeId }),
            style: "color: #4b5563;",
          },
          description: {
            value: isPayment ? "[BAYAR] Pembayaran Hutang" : row.productName || "—",
            style: isPayment ? "font-weight: 700; color: #16a34a;" : "font-weight: 500;",
          },
          quantity: isPayment ? "—" : (row.quantity ?? "—"),
          price: isPayment ? "—" : formatCurrency(row.unitPrice || 0),
          amount: {
            value: isPayment
              ? `- ${formatCurrency(Math.abs(row.totalPrice))}`
              : formatCurrency(row.totalPrice),
            style: isPayment ? "font-weight: 700; color: #16a34a;" : "font-weight: 700;",
          },
        },
      };
    }),
    summaries: [
      {
        label: "Sisa Hutang:",
        value: formatCurrency(customer.totalDebt),
      },
    ],
    signatures: [
      {
        title: "Tanda Terima",
        name: customer.customerName,
      },
      {
        title: "Hormat Kami",
        name: store.storeName,
      },
    ],
    footerNote: "Catatan: Simpan nota ini sebagai bukti catatan hutang piutang yang sah.",
  };
}

export function generateDebtReceiptHtml(options: DebtReceiptOptions): string {
  return generateStatementHtml(buildDebtStatementOptions(options));
}

export function printDebtReceipt(options: DebtReceiptOptions): void {
  const statementOptions = buildDebtStatementOptions(options);
  const printDocTitle = `Nota-Hutang-${options.customer.customerName.replace(/\s+/g, "-")}`;
  printStatementDocument(statementOptions, printDocTitle);
}

export async function saveDebtReceiptImage(options: DebtReceiptOptions): Promise<boolean> {
  const statementOptions = buildDebtStatementOptions(options);
  const fileName = `hutang-${options.customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
  return saveStatementImage(statementOptions, {
    filename: fileName,
    folder: "Image",
    toastTitle: "Nota Disimpan",
    toastDescription:
      typeof window !== "undefined" && window.AndroidBridge
        ? "Nota hutang berhasil disimpan di Download/WarungPOS/Image/"
        : "Nota hutang berhasil disimpan sebagai gambar PNG",
  });
}

export async function shareDebtReceiptImage(options: DebtReceiptOptions): Promise<boolean> {
  const statementOptions = buildDebtStatementOptions(options);
  const fileName = `hutang-${options.customer.customerName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.png`;
  const title = `Nota Catatan Hutang - ${options.customer.customerName} (${options.store.storeName})`;
  return shareStatementImage(statementOptions, {
    filename: fileName,
    title,
    errorTitle: "Gagal Membagikan",
    errorDescription: "Terjadi kesalahan saat membagikan nota hutang",
  });
}
