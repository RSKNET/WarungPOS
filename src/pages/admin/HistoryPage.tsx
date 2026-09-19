import { useState, useMemo } from "react";
import { Transaction } from "@/types/pos";
import {
  getTransactions,
  getTodayRevenue,
  getTodayTransactions,
} from "@/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { Receipt } from "@/components/Receipt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Receipt as ReceiptIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchInput } from "@/hooks/use-search-input";

export function HistoryPage() {
  const [transactions] = useState<Transaction[]>(() => getTransactions());
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const {
    searchQuery: search,
    setSearchQuery: setSearch,
    isSearchDisabled,
  } = useSearchInput([receiptOpen]);

  const todayTransactions = getTodayTransactions();
  const todayRevenue = getTodayRevenue();

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const searchLower = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.id.toLowerCase().includes(searchLower) ||
        t.items.some((item) =>
          item.product.name.toLowerCase().includes(searchLower),
        ),
    );
  }, [transactions, search]);

  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.total, 0);
    const avgTransaction =
      transactions.length > 0 ? total / transactions.length : 0;
    return { total, avgTransaction };
  }, [transactions]);

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReceiptOpen(true);
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 px-3 sm:px-4 bg-muted/15 border-y border-border/40 text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Hari ini:</span>
          <span className="font-bold text-primary">{formatCurrency(todayRevenue)}</span>
          <span className="text-xs text-muted-foreground">({todayTransactions.length} trx)</span>
        </div>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total Penjualan:</span>
          <span className="font-bold text-foreground">{formatCurrency(stats.total)}</span>
          <span className="text-xs text-muted-foreground">({transactions.length} trx)</span>
        </div>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rata-rata Trx:</span>
          <span className="font-bold text-foreground">{formatCurrency(stats.avgTransaction)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari ID transaksi, nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            disabled={isSearchDisabled}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          {filteredTransactions.length} transaksi
        </span>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground border-y border-border/40">
          {transactions.length === 0
            ? "Belum ada riwayat transaksi tercatat."
            : "Tidak ditemukan transaksi yang cocok dengan pencarian."}
        </div>
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-muted/20">
                <tr>
                  <th className="py-3.5 px-3">No. Trx</th>
                  <th className="py-3.5 px-3">Tanggal</th>
                  <th className="py-3.5 px-3">Item</th>
                  <th className="py-3.5 px-3">Tipe</th>
                  <th className="py-3.5 px-3 text-right">Total</th>
                  <th className="py-3.5 px-3 text-right">Bayar</th>
                  <th className="py-3.5 px-3 text-right">Kembali</th>
                  <th className="py-3.5 px-2 text-center w-12">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-sm text-foreground">
                      #{transaction.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap text-sm">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="truncate font-semibold text-foreground text-sm">
                        {transaction.items.map((i) => i.product.name).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {transaction.items.reduce((sum, i) => sum + i.quantity, 0)} item
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      {transaction.paymentType === "debt" ? (
                        <Badge variant="destructive" className="text-xs h-6 px-2 font-medium">
                          Hutang
                          {transaction.customerName && (
                            <span className="ml-1 opacity-90">
                              ({transaction.customerName})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs h-6 px-2 font-medium">
                          Tunai
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-sm sm:text-base tabular-nums text-foreground">
                      {formatCurrency(transaction.total)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-muted-foreground text-sm">
                      {transaction.paymentType === "debt"
                        ? "—"
                        : formatCurrency(transaction.payment)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-primary font-semibold text-sm">
                      {transaction.paymentType === "debt"
                        ? "—"
                        : formatCurrency(transaction.change)}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="Lihat Struk"
                        onClick={() => handleViewReceipt(transaction)}
                      >
                        <ReceiptIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border/30 border-y border-border/40">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="py-3.5 space-y-2 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      #{transaction.id.slice(0, 8).toUpperCase()}
                    </span>
                    {transaction.paymentType === "debt" ? (
                      <Badge variant="destructive" className="text-xs h-5 px-2 font-medium">
                        Hutang {transaction.customerName && `(${transaction.customerName})`}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs h-5 px-2 font-medium">
                        Tunai
                      </Badge>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-foreground">
                    {formatCurrency(transaction.total)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>{formatDate(transaction.createdAt)}</span>
                  <span>{transaction.items.reduce((sum, i) => sum + i.quantity, 0)} item</span>
                </div>

                <p className="text-sm text-foreground/90 line-clamp-1">
                  {transaction.items.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-muted-foreground">
                    {transaction.paymentType !== "debt" && (
                      <span>
                        Bayar: {formatCurrency(transaction.payment)} • Kembali:{" "}
                        <span className="text-primary font-bold">
                          {formatCurrency(transaction.change)}
                        </span>
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium gap-1.5"
                    onClick={() => handleViewReceipt(transaction)}
                  >
                    <ReceiptIcon className="w-3.5 h-3.5" />
                    Lihat Struk
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Receipt
        transaction={selectedTransaction}
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setSelectedTransaction(null);
        }}
      />
    </div>
  );
}

