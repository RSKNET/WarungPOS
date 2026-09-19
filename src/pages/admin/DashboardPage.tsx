import { useState, useEffect, useMemo } from "react";
import { Product, ProductVariant, Transaction } from "@/types/pos";
import { DebtPayment } from "@/types/debt";
import { waitForProducts, waitForTransactions, waitForVariants } from "@/database";
import { getAllPayments } from "@/database/debts";
import { formatCurrency } from "@/lib/format";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [productsData, variantsData, transactionsData, payments] = await Promise.all([
          waitForProducts(),
          waitForVariants(),
          waitForTransactions(),
          Promise.resolve(getAllPayments()),
        ]);
        if (mounted) {
          setProducts(productsData);
          setVariants(variantsData);
          setTransactions(transactionsData);
          setDebtPayments(payments);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const calculateDayRevenue = (dateStr: string) => {
    const cashRevenue = transactions
      .filter(
        (t) =>
          new Date(t.createdAt).toDateString() === dateStr &&
          t.paymentType !== "debt",
      )
      .reduce((sum, t) => sum + t.total, 0);

    const paymentRevenue = debtPayments
      .filter((p) => new Date(p.createdAt).toDateString() === dateStr)
      .reduce((sum, p) => sum + p.amount, 0);

    return cashRevenue + paymentRevenue;
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const todayTx = transactions.filter(
      (t) => new Date(t.createdAt).toDateString() === today,
    );
    const yesterdayTx = transactions.filter(
      (t) => new Date(t.createdAt).toDateString() === yesterday,
    );

    const todayRevenue = calculateDayRevenue(today);
    const yesterdayRevenue = calculateDayRevenue(yesterday);

    const revenueChange =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : todayRevenue > 0
          ? 100
          : 0;

    const txChange =
      yesterdayTx.length > 0
        ? ((todayTx.length - yesterdayTx.length) / yesterdayTx.length) * 100
        : todayTx.length > 0
          ? 100
          : 0;

    const lowStockItems: { id: string; name: string; stock: number }[] = [];
    const outOfStockItems: { id: string; name: string; stock: number }[] = [];

    variants.forEach((v) => {
      const prod = products.find((p) => p.id === v.productId);
      if (!prod) return;

      const itemName = `${prod.name} (${v.name})`;
      if (v.stock === 0) {
        outOfStockItems.push({ id: v.id, name: itemName, stock: v.stock });
      } else if (v.stock <= 5 && v.stock > 0) {
        lowStockItems.push({ id: v.id, name: itemName, stock: v.stock });
      }
    });

    return {
      todayRevenue,
      todayTxCount: todayTx.length,
      totalProducts: products.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      revenueChange,
      txChange,
      lowStockItems,
      outOfStockItems,
    };
  }, [products, variants, transactions, debtPayments]);

  const topProducts = useMemo(() => {
    const productSales: Record<
      string,
      { name: string; sold: number; revenue: number }
    > = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!productSales[item.product.id]) {
          productSales[item.product.id] = {
            name: item.product.name,
            sold: 0,
            revenue: 0,
          };
        }
        productSales[item.product.id].sold += item.quantity;
        productSales[item.product.id].revenue += item.subtotal;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [transactions]);

  const chartData = useMemo(() => {
    const last7Days: { date: string; revenue: number; transactions: number }[] =
      [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toDateString();
      const dayTx = transactions.filter(
        (t) => new Date(t.createdAt).toDateString() === dateStr,
      );

      last7Days.push({
        date: date.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
        }),
        revenue: calculateDayRevenue(dateStr),
        transactions: dayTx.length,
      });
    }

    return last7Days;
  }, [transactions, debtPayments]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-8 border-b border-border/40">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Pendapatan Hari Ini</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            {formatCurrency(stats.todayRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.revenueChange >= 0 ? "+" : ""}{stats.revenueChange.toFixed(0)}% dari kemarin
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Transaksi Hari Ini</span>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {stats.todayTxCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.txChange >= 0 ? "+" : ""}{stats.txChange.toFixed(0)}% dari kemarin
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Total Produk</span>
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {stats.totalProducts}
          </div>
          <p className="text-xs text-muted-foreground">
            produk terdaftar
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-500">
            {stats.lowStockCount + stats.outOfStockCount}
          </div>
          <p className="text-xs text-muted-foreground">
            stok perlu perhatian
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 pb-8 border-b border-border/40">
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Pendapatan 7 Hari Terakhir
          </h2>
          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="date"
                  className="text-xs font-medium"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs font-medium"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="hsl(var(--primary) / 0.12)"
                  name="Pendapatan"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Produk Terlaris
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              Belum ada data penjualan
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-mono font-bold text-muted-foreground w-5 text-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sold} terjual
                      </p>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-foreground shrink-0">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(stats.lowStockItems.length > 0 || stats.outOfStockItems.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Peringatan Stok</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.outOfStockItems.length + stats.lowStockItems.length} item perlu perhatian
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {stats.outOfStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-border/30 text-sm"
              >
                <span className="font-semibold truncate mr-2 text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 font-bold text-destructive text-xs">
                  Habis (0)
                </span>
              </div>
            ))}
            {stats.lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-border/30 text-sm"
              >
                <span className="font-semibold truncate mr-2 text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 font-bold text-warning text-xs">
                  Sisa {item.stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

