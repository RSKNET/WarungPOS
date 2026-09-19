import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Calendar, Filter, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getEmployees,
  getEarnings,
  createEarning,
  deleteEarning,
} from "@/database/employees";
import { Employee, EmployeeEarning } from "@/types/employee";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function EarningsPage() {
  const { toast } = useToast();
  const [employees] = useState<Employee[]>(() => getEmployees());
  const [earnings, setEarnings] = useState<EmployeeEarning[]>(() =>
    getEarnings(),
  );
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [earningToDelete, setEarningToDelete] =
    useState<EmployeeEarning | null>(null);

  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formType, setFormType] = useState<EmployeeEarning["type"]>("salary");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const filteredEarnings = useMemo(() => {
    return earnings.filter((e) => {
      const matchesSearch =
        e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee =
        filterEmployee === "all" || e.employeeId === filterEmployee;
      const matchesType = filterType === "all" || e.type === filterType;
      return matchesSearch && matchesEmployee && matchesType;
    });
  }, [earnings, searchQuery, filterEmployee, filterType]);

  const earningsByEmployee = useMemo(() => {
    const grouped: Record<
      string,
      {
        employeeName: string;
        earnings: EmployeeEarning[];
        total: number;
      }
    > = {};

    filteredEarnings.forEach((earning) => {
      if (!grouped[earning.employeeId]) {
        grouped[earning.employeeId] = {
          employeeName: earning.employeeName,
          earnings: [],
          total: 0,
        };
      }
      grouped[earning.employeeId].earnings.push(earning);
      grouped[earning.employeeId].total += earning.amount;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.employeeName.localeCompare(b.employeeName))
      .map(([employeeId, data]) => ({
        employeeId,
        ...data,
      }));
  }, [filteredEarnings]);

  const refreshEarnings = () => {
    setEarnings(getEarnings());
  };

  const resetForm = () => {
    setFormEmployeeId("");
    setFormType("salary");
    setFormDescription("");
    setFormAmount("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
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

    createEarning({
      employeeId: employee.id,
      employeeName: employee.name,
      type: formType,
      description: formDescription.trim() || getDefaultDescription(formType),
      amount,
    });

    toast({ title: "Berhasil", description: "Pendapatan ditambahkan" });
    setDialogOpen(false);
    resetForm();
    refreshEarnings();
  };

  const getDefaultDescription = (type: EmployeeEarning["type"]): string => {
    switch (type) {
      case "salary":
        return "Gaji Pokok";
      case "commission":
        return "Komisi";
    }
  };

  const handleDelete = () => {
    if (!earningToDelete) return;
    deleteEarning(earningToDelete.id);
    toast({ title: "Berhasil", description: "Pendapatan dihapus" });
    setDeleteDialogOpen(false);
    setEarningToDelete(null);
    refreshEarnings();
  };

  const getTypeBadge = (type: EmployeeEarning["type"]) => {
    const variants: Record<
      EmployeeEarning["type"],
      { label: string; className: string }
    > = {
      salary: { label: "Pokok", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
      commission: {
        label: "Komisi",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      bonus: { label: "Bonus", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
      other: { label: "Lainnya", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
    };
    const variant = variants[type];
    return <Badge variant="outline" className={`${variant.className} text-xs px-2 py-0.5 font-medium`}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pendapatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>
          <Button
            onClick={openAddDialog}
            className="h-10 px-4 text-sm font-medium gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Pendapatan</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
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
            <SelectTrigger className="h-10 text-sm w-full sm:w-[140px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="salary">Pokok</SelectItem>
              <SelectItem value="commission">Komisi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {earningsByEmployee.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery || filterEmployee !== "all" || filterType !== "all"
              ? "Tidak ada pendapatan yang cocok"
              : "Belum ada data pendapatan karyawan"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Catat pendapatan gaji pokok atau komisi karyawan di sini
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {earningsByEmployee.map((employeeData) => (
            <div key={employeeData.employeeId} className="border-b border-border/40 pb-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
                <h3 className="font-bold text-base text-foreground">
                  {employeeData.employeeName}
                </h3>
                <span className="font-bold text-sm text-primary">
                  Total: +{formatCurrency(employeeData.total)}
                </span>
              </div>

              <div className="hidden sm:block overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-3">Tanggal</th>
                      <th className="text-left py-3 px-3">Tipe</th>
                      <th className="text-left py-3 px-3">Keterangan</th>
                      <th className="text-right py-3 px-3">Nominal</th>
                      <th className="text-center py-3 px-3 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {employeeData.earnings.map((earning) => (
                      <tr key={earning.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(
                              new Date(earning.createdAt),
                              "dd MMM yyyy",
                              { locale: localeId },
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {getTypeBadge(earning.type)}
                        </td>
                        <td className="py-3.5 px-3 text-muted-foreground">
                          {earning.description}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-primary">
                          +{formatCurrency(earning.amount)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setEarningToDelete(earning);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus pendapatan"
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
                {employeeData.earnings.map((earning) => (
                  <div key={earning.id} className="py-3 px-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(earning.type)}
                        <span className="font-semibold text-sm text-foreground truncate">
                          {earning.description}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(earning.createdAt), "dd/MM/yyyy", { locale: localeId })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-bold text-sm text-primary font-mono">
                        +{formatCurrency(earning.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setEarningToDelete(earning);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tambah Pendapatan Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Karyawan *</Label>
                <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tipe *</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as EmployeeEarning["type"])}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Pokok</SelectItem>
                    <SelectItem value="commission">Komisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Keterangan</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi (misal: Gaji Pokok Mingguan)"
                maxLength={100}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal *</Label>
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
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button className="flex-1 h-10 text-sm font-medium" onClick={handleSubmit}>
              Simpan Pendapatan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Pendapatan?"
        description={
          <>
            Apakah Anda yakin ingin menghapus pendapatan{" "}
            <strong className="text-foreground">{formatCurrency(earningToDelete?.amount || 0)}</strong> untuk{" "}
            <strong className="text-foreground">{earningToDelete?.employeeName}</strong>?
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

