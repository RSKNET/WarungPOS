import { useState, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, Phone, Briefcase, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { toTitleCase, formatPhoneNumber } from "@/lib/text";
import { formatCurrency } from "@/lib/format";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEarnings,
  getEmployeeDebts,
  getSettlements,
} from "@/database/employees";
import { Employee } from "@/types/employee";
import { sortAlpha } from "@/lib/sorting";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ListPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );

  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const employeeBalances = useMemo(() => {
    const earnings = getEarnings();
    const debts = getEmployeeDebts();
    const settlements = getSettlements();

    const map: Record<string, number> = {};

    earnings.forEach((e) => {
      map[e.employeeId] = (map[e.employeeId] || 0) + e.amount;
    });
    debts.forEach((d) => {
      map[d.employeeId] = (map[d.employeeId] || 0) - d.amount;
    });
    settlements.forEach((s) => {
      if (s.type === "admin_to_employee") {
        map[s.employeeId] = (map[s.employeeId] || 0) - s.amount;
      } else {
        map[s.employeeId] = (map[s.employeeId] || 0) + s.amount;
      }
    });

    return map;
  }, [employees]);

  const filteredEmployees = sortAlpha(
    employees.filter(
      (e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.position.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    "name",
  );

  const refreshEmployees = () => {
    setEmployees(getEmployees());
  };

  const resetForm = () => {
    setFormName("");
    setFormPosition("");
    setFormPhone("");
    setEditingEmployee(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormName(employee.name);
    setFormPosition(employee.position);
    setFormPhone(employee.phone || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || !formPosition.trim()) {
      toast({
        title: "Error",
        description: "Nama dan posisi harus diisi",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: toTitleCase(formName.trim()),
      position: toTitleCase(formPosition.trim()),
      phone: formPhone.trim() ? formatPhoneNumber(formPhone.trim()) : undefined,
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, data);
      toast({ title: "Berhasil", description: "Data karyawan diperbarui" });
    } else {
      createEmployee(data);
      toast({ title: "Berhasil", description: "Karyawan baru ditambahkan" });
    }

    setDialogOpen(false);
    resetForm();
    refreshEmployees();
  };

  const handleDelete = () => {
    if (!employeeToDelete) return;
    deleteEmployee(employeeToDelete.id);
    toast({ title: "Berhasil", description: "Karyawan dihapus" });
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
    refreshEmployees();
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex items-center justify-between gap-2.5 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cari dari ${employees.length} karyawan...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
            maxLength={50}
            disabled={isSearchDisabled}
          />
        </div>
        <Button
          onClick={openAddDialog}
          className="h-10 px-4 text-sm font-medium gap-2 shrink-0 sm:ml-auto"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Karyawan</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery
              ? "Tidak ada karyawan yang cocok"
              : "Belum ada data karyawan"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tambahkan data karyawan baru untuk mengelola gaji dan kasbon
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden sm:block overflow-x-auto w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-3">Karyawan</th>
                  <th className="text-left py-3 px-3">Jabatan</th>
                  <th className="text-left py-3 px-3">No. Telepon</th>
                  <th className="text-left py-3 px-3">Status Saldo</th>
                  <th className="text-right py-3 px-3 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredEmployees.map((employee) => {
                  const balance = employeeBalances[employee.id] || 0;
                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => openEditDialog(employee)}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(employee.name)}
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-foreground block">
                              {employee.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Terdaftar{" "}
                              {format(new Date(employee.createdAt), "dd MMM yyyy", {
                                locale: localeId,
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {employee.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-muted-foreground">
                        {employee.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground/90 font-mono">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {employee.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {balance > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                            <span className="text-xs font-normal text-muted-foreground">Hak Gaji:</span>
                            <span>+{formatCurrency(balance)}</span>
                          </span>
                        ) : balance < 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-destructive">
                            <span className="text-xs font-normal text-muted-foreground">Hutang:</span>
                            <span>-{formatCurrency(Math.abs(balance))}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Saldo seimbang (Rp 0)
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(employee)}
                            title="Edit karyawan"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus karyawan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border/30 w-full">
            {filteredEmployees.map((employee) => {
              const balance = employeeBalances[employee.id] || 0;
              return (
                <div
                  key={employee.id}
                  className="py-3.5 px-1 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                  onClick={() => openEditDialog(employee)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(employee.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {employee.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{employee.position}</span>
                        {employee.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{employee.phone}</span>
                          </>
                        )}
                      </div>
                      {balance !== 0 && (
                        <div className="mt-1 text-xs">
                          {balance > 0 ? (
                            <span className="text-primary font-bold">
                              Hak Gaji: +{formatCurrency(balance)}
                            </span>
                          ) : (
                            <span className="text-destructive font-bold">
                              Hutang: -{formatCurrency(Math.abs(balance))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(employee)}
                      title="Edit karyawan"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setEmployeeToDelete(employee);
                        setDeleteDialogOpen(true);
                      }}
                      title="Hapus karyawan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingEmployee ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Nama Karyawan *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama lengkap karyawan"
                maxLength={50}
                className="h-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-sm font-medium">Posisi / Jabatan *</Label>
                <Input
                  id="position"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="Kasir / Staff / Penjaga"
                  maxLength={30}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Nomor HP</Label>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  maxLength={15}
                  className="h-10 text-sm"
                />
              </div>
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
              {editingEmployee ? "Simpan Perubahan" : "Tambah Karyawan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Karyawan?"
        description={`Apakah Anda yakin ingin menghapus karyawan "${employeeToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

