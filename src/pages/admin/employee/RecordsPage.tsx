import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Calendar, Banknote, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getEmployees,
  getEarnings,
  getEmployeeDebts,
  getSettlements,
  createSettlement,
} from "@/database/employees";
import {
  Employee,
  EmployeeEarning,
  EmployeeDebt,
  EmployeeSettlement,
} from "@/types/employee";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type RecordItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "earning" | "debt" | "settlement";
  category: string;
  description: string;
  amount: number;
  createdAt: string;
};

export function RecordsPage() {
  const { toast } = useToast();
  const [employees] = useState<Employee[]>(() => getEmployees());
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    settlementDialogOpen,
  ]);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    balance: number;
  } | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");

  useEffect(() => {
    if (selectedEmployee) {
      setSettlementAmount(Math.abs(selectedEmployee.balance).toString());
    }
  }, [selectedEmployee]);

  const allRecords = useMemo(() => {
    const earnings = getEarnings();
    const debts = getEmployeeDebts();
    const settlements = getSettlements();

    const earningRecords: RecordItem[] = earnings.map((e: EmployeeEarning) => ({
      id: `earning-${e.id}`,
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      type: "earning" as const,
      category: e.type === "salary" ? "Pokok" : "Komisi",
      description: e.description,
      amount: e.amount,
      createdAt: e.createdAt,
    }));

    const debtRecords: RecordItem[] = debts.map((d: EmployeeDebt) => ({
      id: `debt-${d.id}`,
      employeeId: d.employeeId,
      employeeName: d.employeeName,
      type: "debt" as const,
      category: "Hutang",
      description: d.description,
      amount: d.amount,
      createdAt: d.createdAt,
    }));

    const settlementRecords: RecordItem[] = settlements.map(
      (s: EmployeeSettlement) => ({
        id: `settlement-${s.id}`,
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        type: "settlement" as const,
        category:
          s.type === "admin_to_employee" ? "Dibayar Admin" : "Dibayar Pekerja",
        description: s.description,
        amount: s.amount,
        createdAt: s.createdAt,
      }),
    );

    return [...earningRecords, ...debtRecords, ...settlementRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [refreshKey]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const matchesSearch =
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee =
        filterEmployee === "all" || r.employeeId === filterEmployee;
      const matchesType = filterType === "all" || r.type === filterType;
      return matchesSearch && matchesEmployee && matchesType;
    });
  }, [allRecords, searchQuery, filterEmployee, filterType]);

  const recordsByEmployee = useMemo(() => {
    const grouped: Record<
      string,
      {
        employeeName: string;
        records: RecordItem[];
        totalEarning: number;
        totalDebt: number;
        totalSettlement: number;
      }
    > = {};

    filteredRecords.forEach((record) => {
      if (!grouped[record.employeeId]) {
        grouped[record.employeeId] = {
          employeeName: record.employeeName,
          records: [],
          totalEarning: 0,
          totalDebt: 0,
          totalSettlement: 0,
        };
      }
      grouped[record.employeeId].records.push(record);
      if (record.type === "earning") {
        grouped[record.employeeId].totalEarning += record.amount;
      } else if (record.type === "debt") {
        grouped[record.employeeId].totalDebt += record.amount;
      } else if (record.type === "settlement") {
        if (record.category === "Dibayar Admin") {
          grouped[record.employeeId].totalSettlement += record.amount;
        } else {
          grouped[record.employeeId].totalSettlement -= record.amount;
        }
      }
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.employeeName.localeCompare(b.employeeName))
      .map(([employeeId, data]) => ({
        employeeId,
        ...data,
      }));
  }, [filteredRecords]);

  const handleSettlement = (
    employeeId: string,
    employeeName: string,
    balance: number,
  ) => {
    setSelectedEmployee({ id: employeeId, name: employeeName, balance });
    setSettlementDialogOpen(true);
  };

  const confirmSettlement = () => {
    if (!selectedEmployee || selectedEmployee.balance === 0) return;

    const amount = Number(settlementAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Nominal harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    const balance = selectedEmployee.balance;
    const isAdminPaying = balance > 0;

    createSettlement({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      type: isAdminPaying ? "admin_to_employee" : "employee_to_admin",
      amount,
      description: isAdminPaying
        ? "Pembayaran gaji ke karyawan"
        : "Pelunasan hutang dari karyawan",
    });

    toast({
      title: "Berhasil",
      description: isAdminPaying
        ? `Pembayaran ${formatCurrency(amount)} ke ${selectedEmployee.name} dicatat`
        : `Pelunasan ${formatCurrency(amount)} dari ${selectedEmployee.name} dicatat`,
    });

    setSettlementDialogOpen(false);
    setSelectedEmployee(null);
    setSettlementAmount("");
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari histori pencatatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
            maxLength={50}
            disabled={isSearchDisabled}
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Karyawan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Karyawan</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-[150px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="earning">Pendapatan</SelectItem>
              <SelectItem value="debt">Hutang / Kasbon</SelectItem>
              <SelectItem value="settlement">Pembayaran</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {recordsByEmployee.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery || filterEmployee !== "all" || filterType !== "all"
              ? "Tidak ada pencatatan yang cocok"
              : "Belum ada histori pencatatan"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Histori transaksi gaji, kasbon, dan pelunasan akan tercatat di sini
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {recordsByEmployee.map((employeeData) => (
            <div key={employeeData.employeeId} className="border-b border-border/40 pb-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
                <h3 className="font-bold text-base text-foreground">
                  {employeeData.employeeName}
                </h3>
                {(() => {
                  const balance =
                    employeeData.totalEarning -
                    employeeData.totalDebt -
                    employeeData.totalSettlement;
                  const isPositive = balance >= 0;
                  return (
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-sm font-mono ${isPositive ? "text-primary" : "text-destructive"}`}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(balance)}
                      </span>
                      {balance !== 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs font-medium gap-1.5"
                          onClick={() =>
                            handleSettlement(
                              employeeData.employeeId,
                              employeeData.employeeName,
                              balance,
                            )
                          }
                        >
                          <Banknote className="h-4 w-4" />
                          Bayar
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-3">Tanggal</th>
                      <th className="text-left py-3 px-3">Tipe Transaksi</th>
                      <th className="text-left py-3 px-3">Keterangan</th>
                      <th className="text-right py-3 px-3">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {employeeData.records.map((record) => {
                      let badgeClass = "";
                      let textClass = "";
                      let prefix = "";

                      if (record.type === "earning") {
                        badgeClass = "bg-primary/10 text-primary border-primary/20";
                        textClass = "text-primary";
                        prefix = "+";
                      } else if (record.type === "debt") {
                        badgeClass = "bg-destructive/10 text-destructive border-destructive/20";
                        textClass = "text-destructive";
                        prefix = "-";
                      } else if (record.type === "settlement") {
                        badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                        textClass = "text-amber-600 dark:text-amber-400";
                        prefix =
                          record.category === "Dibayar Admin" ? "-" : "+";
                      }

                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(
                                new Date(record.createdAt),
                                "dd MMM yyyy",
                                { locale: localeId },
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge variant="outline" className={`${badgeClass} text-xs px-2 py-0.5 font-medium`}>
                              {record.category}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 text-muted-foreground">
                            {record.description}
                          </td>
                          <td
                            className={`py-3.5 px-3 text-right font-mono font-semibold ${textClass}`}
                          >
                            {prefix}
                            {formatCurrency(record.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-border/30 w-full">
                {employeeData.records.map((record) => {
                  let badgeClass = "";
                  let textClass = "";
                  let prefix = "";

                  if (record.type === "earning") {
                    badgeClass = "bg-primary/10 text-primary border-primary/20";
                    textClass = "text-primary";
                    prefix = "+";
                  } else if (record.type === "debt") {
                    badgeClass = "bg-destructive/10 text-destructive border-destructive/20";
                    textClass = "text-destructive";
                    prefix = "-";
                  } else if (record.type === "settlement") {
                    badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                    textClass = "text-amber-600 dark:text-amber-400";
                    prefix =
                      record.category === "Dibayar Admin" ? "-" : "+";
                  }

                  return (
                    <div key={record.id} className="py-3 px-1 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${badgeClass} text-xs px-2 py-0.5 shrink-0 font-medium`}>
                            {record.category}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground truncate">
                            {record.description}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(record.createdAt), "dd/MM/yyyy", { locale: localeId })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`font-bold text-sm font-mono ${textClass}`}>
                          {prefix}{formatCurrency(record.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={settlementDialogOpen}
        onOpenChange={setSettlementDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Bayar / Lunasi Saldo Karyawan</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 py-2">
              <div className="space-y-2 py-2 border-b border-border/40 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Karyawan:</span>
                  <span className="font-bold text-foreground">{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Posisi Saldo:</span>
                  <span className={`font-bold font-mono ${selectedEmployee.balance >= 0 ? "text-primary" : "text-destructive"}`}>
                    {selectedEmployee.balance >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(selectedEmployee.balance))}
                    {" "}
                    ({selectedEmployee.balance >= 0 ? "Hak Gaji" : "Kasbon"})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nominal Pembayaran *</Label>
                <PriceInput
                  value={settlementAmount}
                  onChange={setSettlementAmount}
                  placeholder="0"
                  className="h-10 text-sm font-mono"
                />
              </div>

              {(() => {
                const amount = Number(settlementAmount) || 0;
                const newBalance =
                  selectedEmployee.balance > 0
                    ? selectedEmployee.balance - amount
                    : selectedEmployee.balance + amount;
                return (
                  <div className="py-2 flex justify-between items-center text-sm border-t border-border/40">
                    <span className="text-muted-foreground text-xs">Sisa Saldo Setelah Bayar:</span>
                    <span className={`font-bold font-mono ${newBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                      {newBalance >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(newBalance))}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => setSettlementDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 h-10 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={confirmSettlement}
            >
              Konfirmasi Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

