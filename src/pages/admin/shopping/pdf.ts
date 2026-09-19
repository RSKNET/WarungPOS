import { ShoppingItem, ShoppingCategory } from "@/types/shopping-list";
import { printDocument } from "@/lib/native-bridge";

export function exportShoppingListPdf(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
) {
  let storeName = "WarungPOS";
  try {
    const saved = localStorage.getItem("store-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.storeName) storeName = parsed.storeName;
    }
  } catch {
    // fallback
  }

  const now = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeCategories = categories.filter((c) =>
    items.some((i) => i.categoryId === c.id),
  );

  const categoriesHtml = (activeCategories.length > 0 ? activeCategories : categories)
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
            <span>${storeName}</span>
            <span>Kategori: ${category.name} • ${categoryItems.length} item</span>
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
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
        .category-page {
          page-break-after: always;
        }
        .category-page:last-child {
          page-break-after: avoid;
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
          color: #64748b;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        td {
          padding: 7px 8px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 9.5pt;
          vertical-align: middle;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .col-check {
          width: 26px;
          text-align: center;
          padding-left: 2px;
          padding-right: 2px;
        }
        .box {
          width: 13px;
          height: 13px;
          border: 1.5px solid #94a3b8;
          border-radius: 2.5px;
          display: inline-block;
          vertical-align: middle;
          font-size: 9px;
          line-height: 12px;
          text-align: center;
          font-weight: bold;
        }
        .box.checked {
          background: #0f172a;
          border-color: #0f172a;
          color: #ffffff;
        }
        .col-no {
          width: 26px;
          text-align: center;
          color: #94a3b8;
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
          color: #64748b;
        }
        .col-qty {
          text-align: right;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #0f172a;
        }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 8pt;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      ${categoriesHtml}
    </body>
    </html>
  `;

  printDocument(html, `Daftar-Belanja-${now.replace(/[\s,]+/g, "-")}`);
}
