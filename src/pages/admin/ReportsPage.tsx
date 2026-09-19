import { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction } from "@/types/pos";
import { DebtPayment } from "@/types/debt";
import { waitForTransactions } from "@/database";
import { getAllPayments, getDebts } from "@/database/debts";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { saveCsvToDevice } from "@/lib/native-bridge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  TrendingUp,
  Loader2,
  PiggyBank,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

type Period = "daily" | "weekly" | "monthly";
type ReportType = "sales" | "profit";

export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");
  const [reportType, setReportType] = useState<ReportType>("sales");

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"sales" | "profit" | "all">("sales");
  const [exportPeriod, setExportPeriod] = useState<Period>("daily");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [txData, payments] = await Promise.all([
          waitForTransactions(),
          Promise.resolve(getAllPayments()),
        ]);
        if (mounted) {
          setTransactions(txData);
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

  const calculateProfit = (tx: Transaction) => {
    if (tx.paymentType === "debt") return 0;

    return tx.items.reduce((sum, item) => {
      const costPrice = item.variant.costPrice || 0;
      const sellingPrice =
        item.priceType === "wholesale"
          ? item.variant.wholesalePrice
          : item.variant.retailPrice;
      const profit = (sellingPrice - costPrice) * item.quantity;
      return sum + profit;
    }, 0);
  };

  const calculatePaymentProfit = useMemo(() => {
    const debts = getDebts();
    const debtProfitMap = new Map<
      string,
      { totalProfit: number; total: number }
    >();

    const debtTransactions = transactions.filter(
      (tx) => tx.paymentType === "debt",
    );

    debtTransactions.forEach((tx) => {
      if (!tx.customerId) return;

      const profit = tx.items.reduce((sum, item) => {
        const costPrice = item.variant.costPrice || 0;
        const sellingPrice =
          item.priceType === "wholesale"
            ? item.variant.wholesalePrice
            : item.variant.retailPrice;
        return sum + (sellingPrice - costPrice) * item.quantity;
      }, 0);

      const existing = debtProfitMap.get(tx.customerId) || {
        totalProfit: 0,
        total: 0,
      };
      existing.totalProfit += profit;
      existing.total += tx.total;
      debtProfitMap.set(tx.customerId, existing);
    });

    debts.forEach((debt) => {
      if (debtProfitMap.has(debt.customerId)) return;
    });

    return (payment: DebtPayment): number => {
      const customerId =
        payment.customerId ||
        (payment.debtId.startsWith("customer-")
          ? payment.debtId.replace("customer-", "")
          : null);

      if (!customerId) {
        const debt = debts.find((d) => d.id === payment.debtId);
        if (!debt) return 0;

        const tx = debtTransactions.find(
          (t) =>
            t.customerId === debt.customerId &&
            Math.abs(
              new Date(t.createdAt).getTime() -
                new Date(debt.createdAt).getTime(),
            ) < 60000,
        );

        if (tx) {
          const txProfit = tx.items.reduce((sum, item) => {
            const costPrice = item.variant.costPrice || 0;
            const sellingPrice =
              item.priceType === "wholesale"
                ? item.variant.wholesalePrice
                : item.variant.retailPrice;
            return sum + (sellingPrice - costPrice) * item.quantity;
          }, 0);
          const margin = tx.total > 0 ? txProfit / tx.total : 0;
          return payment.amount * margin;
        }
        return 0;
      }

      const profitData = debtProfitMap.get(customerId);
      if (!profitData || profitData.total === 0) return 0;

      const margin = profitData.totalProfit / profitData.total;
      return payment.amount * margin;
    };
  }, [transactions]);

  const generatePeriodData = useCallback(
    (targetPeriod: Period) => {
      const processTransactions = (
        txList: Transaction[],
        paymentList: DebtPayment[],
      ) => {
        const cashRevenue = txList
          .filter((t) => t.paymentType !== "debt")
          .reduce((sum, t) => sum + t.total, 0);

        const paymentRevenue = paymentList.reduce((sum, p) => sum + p.amount, 0);
        const revenue = cashRevenue + paymentRevenue;

        const cashProfit = txList.reduce((sum, t) => sum + calculateProfit(t), 0);
        const paymentProfit = paymentList.reduce(
          (sum, p) => sum + calculatePaymentProfit(p),
          0,
        );
        const profit = cashProfit + paymentProfit;

        const cost = revenue - profit;
        return { revenue, profit, cost, transactions: txList.length };
      };

      if (targetPeriod === "daily") {
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 86400000);
          const dateStr = date.toDateString();
          const dayTx = transactions.filter(
            (t) => new Date(t.createdAt).toDateString() === dateStr,
          );
          const dayPayments = debtPayments.filter(
            (p) => new Date(p.createdAt).toDateString() === dateStr,
          );
          const data = processTransactions(dayTx, dayPayments);

          last30Days.push({
            date: date.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
            }),
            ...data,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          });
        }
        return last30Days;
      } else if (targetPeriod === "weekly") {
        const weeks = [];
        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(Date.now() - (i * 7 + 6) * 86400000);
          const weekEnd = new Date(Date.now() - i * 7 * 86400000);

          const weekTx = transactions.filter((t) => {
            const txDate = new Date(t.createdAt);
            return txDate >= weekStart && txDate <= weekEnd;
          });
          const weekPayments = debtPayments.filter((p) => {
            const pDate = new Date(p.createdAt);
            return pDate >= weekStart && pDate <= weekEnd;
          });

          const data = processTransactions(weekTx, weekPayments);
          weeks.push({
            date: `${weekStart.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`,
            ...data,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          });
        }
        return weeks;
      } else {
        const months = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.getMonth();
          const year = date.getFullYear();

          const monthTx = transactions.filter((t) => {
            const txDate = new Date(t.createdAt);
            return txDate.getMonth() === month && txDate.getFullYear() === year;
          });
          const monthPayments = debtPayments.filter((p) => {
            const pDate = new Date(p.createdAt);
            return pDate.getMonth() === month && pDate.getFullYear() === year;
          });

          const data = processTransactions(monthTx, monthPayments);
          months.push({
            date: date.toLocaleDateString("id-ID", {
              month: "short",
              year: "2-digit",
            }),
            ...data,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          });
        }
        return months;
      }
    },
    [transactions, debtPayments, calculatePaymentProfit],
  );

  const reportData = useMemo(() => generatePeriodData(period), [generatePeriodData, period]);
  const reversedData = useMemo(() => [...reportData].reverse(), [reportData]);

  const summary = useMemo(() => {
    const totalRevenue = reportData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = reportData.reduce((sum, d) => sum + d.profit, 0);
    const totalCost = reportData.reduce((sum, d) => sum + d.cost, 0);
    const totalTransactions = reportData.reduce(
      (sum, d) => sum + d.transactions,
      0,
    );
    const avgRevenue =
      reportData.length > 0 ? totalRevenue / reportData.length : 0;
    const avgProfit =
      reportData.length > 0 ? totalProfit / reportData.length : 0;
    const avgTransactions =
      reportData.length > 0 ? totalTransactions / reportData.length : 0;
    const overallMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalProfit,
      totalCost,
      totalTransactions,
      avgRevenue,
      avgProfit,
      avgTransactions,
      overallMargin,
    };
  }, [reportData]);

  const executeExport = (type: "sales" | "profit" | "all", targetPeriod: Period) => {
    const data = generatePeriodData(targetPeriod);

    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (type === "sales") {
      headers = ["Tanggal", "Total Pendapatan", "Jumlah Transaksi", "Rata-rata per Trx"];
      rows = data.map((d) => [
        d.date,
        d.revenue,
        d.transactions,
        d.transactions > 0 ? Math.round(d.revenue / d.transactions) : 0,
      ]);
    } else if (type === "profit") {
      headers = ["Tanggal", "Total Pendapatan", "Total Modal", "Total Profit", "Margin (%)"];
      rows = data.map((d) => [
        d.date,
        d.revenue,
        d.cost,
        d.profit,
        d.margin.toFixed(1),
      ]);
    } else {
      headers = ["Tanggal", "Pendapatan", "Modal", "Profit", "Margin (%)", "Transaksi"];
      rows = data.map((d) => [
        d.date,
        d.revenue,
        d.cost,
        d.profit,
        d.margin.toFixed(1),
        d.transactions,
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const filename = `laporan-${type}-${targetPeriod}-${new Date().toISOString().split("T")[0]}.csv`;
    saveCsvToDevice(csvContent, filename, "CSV");

    toast({
      title: "Laporan Diekspor",
      description: window.AndroidBridge
        ? `File tersimpan di Download/WarungPOS/CSV/${filename}`
        : "File laporan CSV berhasil diunduh",
    });
  };

  const handleCustomExport = (e: React.FormEvent) => {
    e.preventDefault();
    executeExport(exportType, exportPeriod);
    setExportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={reportType}
        onValueChange={(v) => setReportType(v as ReportType)}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex justify-center w-full sm:w-auto">
            <TabsList className="h-10 p-1">
              <TabsTrigger value="sales" className="h-8 text-sm font-medium gap-2 px-4">
                <TrendingUp className="w-4 h-4" />
                Penjualan
              </TabsTrigger>
              <TabsTrigger value="profit" className="h-8 text-sm font-medium gap-2 px-4">
                <PiggyBank className="w-4 h-4" />
                Profit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="shrink-0">
              <TabsList className="h-10 p-1">
                <TabsTrigger value="daily" className="h-8 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5">Harian</TabsTrigger>
                <TabsTrigger value="weekly" className="h-8 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5">Mingguan</TabsTrigger>
                <TabsTrigger value="monthly" className="h-8 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5">Bulanan</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              onClick={() => {
                setExportType(reportType);
                setExportPeriod(period);
                setExportModalOpen(true);
              }}
              variant="outline"
              className="h-10 px-3 sm:px-4 text-xs sm:text-sm font-medium gap-1.5 sm:gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        <TabsContent value="sales" className="mt-0 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-border/40">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pendapatan</p>
              <p className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight mt-1">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Transaksi</p>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">{summary.totalTransactions} <span className="text-xs font-normal text-muted-foreground">trx</span></p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rata-rata / Periode</p>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">{formatCurrency(summary.avgRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trx / Periode</p>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">{summary.avgTransactions.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">trx</span></p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Grafik Pendapatan</span>
            </div>
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    interval={period === "daily" ? 4 : 0}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Pendapatan"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Grafik Transaksi</span>
            </div>
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    interval={period === "daily" ? 4 : 0}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Transaksi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Rincian Data Penjualan</h3>
                <p className="text-xs text-muted-foreground">Detail transaksi dan omset per {period === "daily" ? "hari" : period === "weekly" ? "minggu" : "bulan"}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">Periode</th>
                    <th className="py-3 px-3 text-right">Transaksi</th>
                    <th className="py-3 px-3 text-right">Rata-rata / Trx</th>
                    <th className="py-3 px-3 text-right">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {reversedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 font-medium text-foreground">{row.date}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">{row.transactions} trx</td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(row.transactions > 0 ? Math.round(row.revenue / row.transactions) : 0)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-primary">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profit" className="mt-0 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-border/40">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pendapatan</p>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</p>
              <p className="text-xl sm:text-2xl font-extrabold text-muted-foreground tracking-tight mt-1">{formatCurrency(summary.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Profit</p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">{formatCurrency(summary.totalProfit)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin Rata-rata</p>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">{summary.overallMargin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-foreground">Grafik Profit & Modal</span>
            </div>
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    interval={period === "daily" ? 4 : 0}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "profit" ? "Profit" : name === "cost" ? "Modal" : name,
                    ]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stackId="1"
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--muted-foreground))"
                    name="Modal"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="1"
                    fill="hsl(142 76% 36%)"
                    stroke="hsl(142 76% 36%)"
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Tren Margin Profit</span>
            </div>
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    interval={period === "daily" ? 4 : 0}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Margin"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(142 76% 36%)" }}
                    name="Margin"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Rincian Data Profit</h3>
                <p className="text-xs text-muted-foreground">Detail pendapatan, modal, laba bersih, dan persentase margin per {period === "daily" ? "hari" : period === "weekly" ? "minggu" : "bulan"}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">Periode</th>
                    <th className="py-3 px-3 text-right">Pendapatan</th>
                    <th className="py-3 px-3 text-right">Modal</th>
                    <th className="py-3 px-3 text-right">Profit Bersih</th>
                    <th className="py-3 px-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {reversedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 font-medium text-foreground">{row.date}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">{formatCurrency(row.revenue)}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">{formatCurrency(row.cost)}</td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-foreground">
                        {row.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Export Laporan CSV</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Unduh data laporan dalam format CSV untuk pembukuan atau spreadsheet
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCustomExport} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Jenis Laporan</label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as "sales" | "profit" | "all")}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih jenis laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Laporan Penjualan (Pendapatan & Transaksi)</SelectItem>
                  <SelectItem value="profit">Laporan Profit (Modal, Profit & Margin)</SelectItem>
                  <SelectItem value="all">Lengkap (Semua Data Penjualan & Profit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rentang Periode</label>
              <Select value={exportPeriod} onValueChange={(v) => setExportPeriod(v as Period)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih rentang periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Harian (30 Hari Terakhir)</SelectItem>
                  <SelectItem value="weekly">Mingguan (12 Minggu Terakhir)</SelectItem>
                  <SelectItem value="monthly">Bulanan (12 Bulan Terakhir)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Format Berkas</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/40 text-sm text-foreground">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV (.csv) - Kompatibel dengan Excel & Google Sheets</span>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportModalOpen(false)}
                className="h-10 px-4 text-sm font-medium"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="h-10 px-4 text-sm font-medium gap-2"
              >
                <Download className="w-4 h-4" />
                Unduh Berkas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

