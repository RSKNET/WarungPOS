import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Calendar, Filter, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getEmployees,
  getEmployeeDebts,
  createEmployeeDebt,
  deleteEmployeeDebt,
} from "@/database/employees";
import { Employee, EmployeeDebt } from "@/types/employee";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function DebtsPage() {
  const { toast } = useToast();
  const [employees] = useState<Employee[]>(() => getEmployees());
  const [debts, setDebts] = useState<EmployeeDebt[]>(() => getEmployeeDebts());
  const [filterEmployee, setFilterEmployee] = useState<string>("all");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    addDialogOpen,
    deleteDialogOpen,
  ]);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const [debtToDelete, setDebtToDelete] = useState<EmployeeDebt | null>(null);

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchesSearch =
        d.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee =
        filterEmployee === "all" || d.employeeId === filterEmployee;
      return matchesSearch && matchesEmployee;
    });
  }, [debts, searchQuery, filterEmployee]);

  const debtsByEmployee = useMemo(() => {
    const grouped: Record<
      string,
      {
        employeeName: string;
        debts: EmployeeDebt[];
        total: number;
      }
    > = {};

    filteredDebts.forEach((debt) => {
      if (!grouped[debt.employeeId]) {
        grouped[debt.employeeId] = {
          employeeName: debt.employeeName,
          debts: [],
          total: 0,
        };
      }
      grouped[debt.employeeId].debts.push(debt);
      grouped[debt.employeeId].total += debt.amount;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.employeeName.localeCompare(b.employeeName))
      .map(([employeeId, data]) => ({
        employeeId,
        ...data,
      }));
  }, [filteredDebts]);

  const refreshDebts = () => {
    setDebts(getEmployeeDebts());
  };

  const resetAddForm = () => {
    setFormEmployeeId("");
    setFormDescription("");
    setFormAmount("");
  };

  const handleAddDebt = () => {
    const employee = employees.find((e) => e.id === formEmployeeId);
    if (!employee) {
      toast({
        title: "Error",
        description: "Pilih karyawan terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(formAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Nominal harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    createEmployeeDebt({
      employeeId: employee.id,
      employeeName: employee.name,
      description: formDescription.trim() || "Kasbon",
      amount,
    });

    toast({ title: "Berhasil", description: "Kasbon karyawan ditambahkan" });
    setAddDialogOpen(false);
    resetAddForm();
    refreshDebts();
  };

  const handleDelete = () => {
    if (!debtToDelete) return;
    deleteEmployeeDebt(debtToDelete.id);
    toast({ title: "Berhasil", description: "Hutang dihapus" });
    setDeleteDialogOpen(false);
    setDebtToDelete(null);
    refreshDebts();
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kasbon/hutang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>

          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-10 text-sm w-[150px] sm:w-[190px] shrink-0">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Semua Karyawan" />
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
        </div>

        <Button
          onClick={() => setAddDialogOpen(true)}
          className="h-10 px-4 text-sm font-medium gap-2 shrink-0 sm:ml-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kasbon</span>
        </Button>
      </div>

      {debtsByEmployee.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery || filterEmployee !== "all"
              ? "Tidak ada kasbon yang cocok"
              : "Belum ada data kasbon karyawan"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Data kasbon atau pinjaman karyawan akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {debtsByEmployee.map((employeeData) => (
            <div key={employeeData.employeeId} className="border-b border-border/40 pb-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
                <h3 className="font-bold text-base text-foreground">
                  {employeeData.employeeName}
                </h3>
                <span className="font-bold text-sm text-destructive">
                  Total: -{formatCurrency(employeeData.total)}
                </span>
              </div>

              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-3">Tanggal</th>
                      <th className="text-left py-3 px-3">Keterangan</th>
                      <th className="text-right py-3 px-3">Nominal</th>
                      <th className="text-center py-3 px-3 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {employeeData.debts.map((debt) => (
                      <tr key={debt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(debt.createdAt), "dd MMM yyyy", {
                              locale: localeId,
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-foreground font-medium">
                          {debt.description}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-destructive">
                          -{formatCurrency(debt.amount)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDebtToDelete(debt);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus kasbon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-border/30 w-full">
                {employeeData.debts.map((debt) => (
                  <div key={debt.id} className="py-3 px-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {debt.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(debt.createdAt), "dd/MM/yyyy", { locale: localeId })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-bold text-sm text-destructive font-mono">
                        -{formatCurrency(debt.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDebtToDelete(debt);
                          setDeleteDialogOpen(true);
                        }}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tambah Kasbon Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Karyawan *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} - {e.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Keterangan</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Misal: Kasbon, Pinjaman Operasional"
                maxLength={100}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Kasbon *</Label>
              <PriceInput
                value={formAmount}
                onChange={setFormAmount}
                placeholder="0"
                className="h-10 text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium"
              onClick={() => setAddDialogOpen(false)}
            >
              Batal
            </Button>
            <Button className="flex-1 h-10 text-sm font-medium" onClick={handleAddDebt}>
              Simpan Kasbon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Kasbon?"
        description={
          <>
            Apakah Anda yakin ingin menghapus catatan kasbon{" "}
            <strong className="text-foreground">{formatCurrency(debtToDelete?.amount || 0)}</strong> dari{" "}
            <strong className="text-foreground">{debtToDelete?.employeeName}</strong>?
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

