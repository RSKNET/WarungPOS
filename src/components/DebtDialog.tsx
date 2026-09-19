import { useState, useMemo } from "react";
import { CartItem } from "@/types/pos";
import { Customer } from "@/types/debt";
import { Employee } from "@/types/employee";
import { formatCurrency } from "@/lib/format";
import { toTitleCase, handlePhoneChange, handlePhoneBlur } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, User, Check, Briefcase, Handshake } from "lucide-react";
import {
  getCustomers,
  addCustomer,
  searchCustomers,
} from "@/database/customers";
import { getEmployees, createEmployee } from "@/database/employees";
import { getPartners, addPartner } from "@/database/partners";
import { Partner } from "@/types/partner";
import { cn } from "@/lib/utils";

interface DebtDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer) => void;
  onConfirmEmployee?: (employee: Employee) => void;
  onConfirmPartner?: (partner: Partner) => void;
  total: number;
  items: CartItem[];
}

export function DebtDialog({
  open,
  onClose,
  onConfirm,
  onConfirmEmployee,
  onConfirmPartner,
  total,
  items,
}: DebtDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [newEmployeePhone, setNewEmployeePhone] = useState("");

  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");
  const [newPartnerAddress, setNewPartnerAddress] = useState("");

  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [partners, setPartners] = useState<Partner[]>(() => getPartners());
  const [activeTab, setActiveTab] = useState<"customer" | "employee" | "partner">(
    "customer",
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    return searchCustomers(search);
  }, [search, customers]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.position.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, employees]);

  const filteredPartners = useMemo(() => {
    if (!search.trim()) return partners;
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.phone && p.phone.includes(search)),
    );
  }, [search, partners]);

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) return;

    const newCustomer = addCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || undefined,
    });

    setCustomers((prev) => [newCustomer, ...prev]);
    setSelectedCustomer(newCustomer);
    setShowAddForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
  };

  const handleAddEmployee = () => {
    if (!newEmployeeName.trim() || !newEmployeePosition.trim()) return;

    const newEmp = createEmployee({
      name: toTitleCase(newEmployeeName.trim()),
      position: toTitleCase(newEmployeePosition.trim()),
      phone: newEmployeePhone.trim() || undefined,
    });

    setEmployees((prev) => [newEmp, ...prev]);
    setSelectedEmployee(newEmp);
    setShowAddForm(false);
    setNewEmployeeName("");
    setNewEmployeePosition("");
    setNewEmployeePhone("");
  };

  const handleAddPartner = () => {
    if (!newPartnerName.trim()) return;

    const newPart = addPartner({
      name: toTitleCase(newPartnerName.trim()),
      phone: newPartnerPhone.trim() || undefined,
      address: newPartnerAddress.trim() || undefined,
    });

    setPartners((prev) => [newPart, ...prev]);
    setSelectedPartner(newPart);
    setShowAddForm(false);
    setNewPartnerName("");
    setNewPartnerPhone("");
    setNewPartnerAddress("");
  };

  const handleConfirm = () => {
    if (activeTab === "customer" && selectedCustomer) {
      onConfirm(selectedCustomer);
      setSelectedCustomer(null);
      setSearch("");
    } else if (
      activeTab === "employee" &&
      selectedEmployee &&
      onConfirmEmployee
    ) {
      onConfirmEmployee(selectedEmployee);
      setSelectedEmployee(null);
      setSearch("");
    } else if (
      activeTab === "partner" &&
      selectedPartner &&
      onConfirmPartner
    ) {
      onConfirmPartner(selectedPartner);
      setSelectedPartner(null);
      setSearch("");
    }
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setSelectedEmployee(null);
    setSelectedPartner(null);
    setSearch("");
    setShowAddForm(false);
    setActiveTab("customer");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewEmployeeName("");
    setNewEmployeePosition("");
    setNewEmployeePhone("");
    setNewPartnerName("");
    setNewPartnerPhone("");
    setNewPartnerAddress("");
    onClose();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "customer" | "employee" | "partner");
    setSelectedCustomer(null);
    setSelectedEmployee(null);
    setSelectedPartner(null);
    setSearch("");
    setShowAddForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewEmployeeName("");
    setNewEmployeePosition("");
    setNewEmployeePhone("");
    setNewPartnerName("");
    setNewPartnerPhone("");
    setNewPartnerAddress("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold">Catat Hutang</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 pt-1">
          <div className="flex items-baseline justify-between pb-3 border-b border-border/40">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tagihan Hutang</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-destructive tracking-tight mt-0.5">{formatCurrency(total)}</p>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {items.reduce((sum, item) => sum + item.quantity, 0)} item
            </span>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="customer" className="gap-2 text-sm h-8">
                <User className="w-4 h-4" />
                Pelanggan
              </TabsTrigger>
              <TabsTrigger value="employee" className="gap-2 text-sm h-8">
                <Briefcase className="w-4 h-4" />
                Karyawan
              </TabsTrigger>
              <TabsTrigger value="partner" className="gap-2 text-sm h-8">
                <Handshake className="w-4 h-4" />
                Mitra
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!showAddForm ? (
            <>

              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={
                      activeTab === "customer"
                        ? "Cari pelanggan..."
                        : activeTab === "employee"
                          ? "Cari karyawan..."
                          : "Cari mitra..."
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  className="h-10 px-3.5 gap-1.5 shrink-0 text-sm font-medium"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-[220px] max-h-[320px]">
                <div className="space-y-1 py-1 pr-3">
                  {activeTab === "customer" &&
                    (filteredCustomers.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Tidak ada pelanggan</p>
                        <p className="text-xs mt-1">Klik tambah untuk mendaftarkan</p>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          className={cn(
                            "w-full px-3.5 py-2.5 rounded-md text-left transition-colors flex items-center justify-between gap-2",
                            selectedCustomer?.id === customer.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted/40 text-foreground",
                          )}
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground truncate">
                                {customer.phone}
                              </p>
                            )}
                          </div>
                          {selectedCustomer?.id === customer.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    ))}

                  {activeTab === "employee" &&
                    (filteredEmployees.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Tidak ada karyawan</p>
                        <p className="text-xs mt-1">Klik tambah untuk mendaftarkan</p>
                      </div>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <button
                          key={employee.id}
                          className={cn(
                            "w-full px-3.5 py-2.5 rounded-md text-left transition-colors flex items-center justify-between gap-2",
                            selectedEmployee?.id === employee.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted/40 text-foreground",
                          )}
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{employee.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {employee.position}
                            </p>
                          </div>
                          {selectedEmployee?.id === employee.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    ))}

                  {activeTab === "partner" &&
                    (filteredPartners.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Handshake className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Tidak ada mitra</p>
                        <p className="text-xs mt-1">Klik tambah untuk mendaftarkan</p>
                      </div>
                    ) : (
                      filteredPartners.map((partner) => (
                        <button
                          key={partner.id}
                          className={cn(
                            "w-full px-3.5 py-2.5 rounded-md text-left transition-colors flex items-center justify-between gap-2",
                            selectedPartner?.id === partner.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted/40 text-foreground",
                          )}
                          onClick={() => setSelectedPartner(partner)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{partner.name}</p>
                            {partner.phone && (
                              <p className="text-xs text-muted-foreground truncate">
                                {partner.phone}
                              </p>
                            )}
                          </div>
                          {selectedPartner?.id === partner.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="space-y-3.5 py-1">
              {activeTab === "customer" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName" className="text-sm font-medium">
                      Nama Pelanggan *
                    </Label>
                    <Input
                      id="customerName"
                      value={newCustomerName}
                      onChange={(e) =>
                        setNewCustomerName(toTitleCase(e.target.value))
                      }
                      placeholder="Masukkan nama pelanggan"
                      className="h-10 text-sm"
                      autoFocus
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customerPhone" className="text-sm font-medium">
                      No. Telepon (opsional)
                    </Label>
                    <Input
                      id="customerPhone"
                      value={newCustomerPhone}
                      onChange={(e) =>
                        handlePhoneChange(e, setNewCustomerPhone)
                      }
                      onBlur={() =>
                        handlePhoneBlur(newCustomerPhone, setNewCustomerPhone)
                      }
                      placeholder="08xxxxxxxxxx"
                      className="h-10 text-sm"
                      maxLength={20}
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={handleAddCustomer}
                      disabled={!newCustomerName.trim()}
                    >
                      Simpan Pelanggan
                    </Button>
                  </div>
                </>
              )}

              {activeTab === "employee" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeName" className="text-sm font-medium">
                      Nama Karyawan *
                    </Label>
                    <Input
                      id="employeeName"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="h-10 text-sm"
                      autoFocus
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employeePosition" className="text-sm font-medium">
                      Posisi / Jabatan *
                    </Label>
                    <Input
                      id="employeePosition"
                      value={newEmployeePosition}
                      onChange={(e) => setNewEmployeePosition(e.target.value)}
                      placeholder="Kasir / Staf / dll"
                      className="h-10 text-sm"
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employeePhone" className="text-sm font-medium">
                      No. HP (opsional)
                    </Label>
                    <Input
                      id="employeePhone"
                      value={newEmployeePhone}
                      onChange={(e) =>
                        handlePhoneChange(e, setNewEmployeePhone)
                      }
                      onBlur={() =>
                        handlePhoneBlur(newEmployeePhone, setNewEmployeePhone)
                      }
                      placeholder="08xxxxxxxxxx"
                      className="h-10 text-sm"
                      maxLength={20}
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewEmployeeName("");
                        setNewEmployeePosition("");
                        setNewEmployeePhone("");
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={handleAddEmployee}
                      disabled={!newEmployeeName.trim() || !newEmployeePosition.trim()}
                    >
                      Simpan Karyawan
                    </Button>
                  </div>
                </>
              )}

              {activeTab === "partner" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="partnerName" className="text-sm font-medium">
                      Nama Mitra *
                    </Label>
                    <Input
                      id="partnerName"
                      value={newPartnerName}
                      onChange={(e) =>
                        setNewPartnerName(toTitleCase(e.target.value))
                      }
                      placeholder="Masukkan nama mitra"
                      className="h-10 text-sm"
                      autoFocus
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="partnerPhone" className="text-sm font-medium">
                      No. Telepon (opsional)
                    </Label>
                    <Input
                      id="partnerPhone"
                      value={newPartnerPhone}
                      onChange={(e) =>
                        handlePhoneChange(e, setNewPartnerPhone)
                      }
                      onBlur={() =>
                        handlePhoneBlur(newPartnerPhone, setNewPartnerPhone)
                      }
                      placeholder="08xxxxxxxxxx"
                      className="h-10 text-sm"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="partnerAddress" className="text-sm font-medium">
                      Alamat (opsional)
                    </Label>
                    <Input
                      id="partnerAddress"
                      value={newPartnerAddress}
                      onChange={(e) => setNewPartnerAddress(e.target.value)}
                      placeholder="Alamat lengkap"
                      className="h-10 text-sm"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewPartnerName("");
                        setNewPartnerPhone("");
                        setNewPartnerAddress("");
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1 h-10 text-sm font-medium"
                      onClick={handleAddPartner}
                      disabled={!newPartnerName.trim()}
                    >
                      Simpan Mitra
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {!showAddForm && (
            <div className="flex gap-2 pt-3 border-t border-border/40 mt-auto">
              <Button
                variant="outline"
                className="flex-1 h-10 text-sm font-medium"
                onClick={handleClose}
              >
                Batal
              </Button>
              <Button
                className="flex-1 h-10 text-sm font-medium"
                onClick={handleConfirm}
                disabled={
                  (activeTab === "customer" && !selectedCustomer) ||
                  (activeTab === "employee" && !selectedEmployee) ||
                  (activeTab === "partner" && !selectedPartner)
                }
              >
                Konfirmasi Hutang
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

