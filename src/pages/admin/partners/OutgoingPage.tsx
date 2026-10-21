import { useState, useMemo } from "react";
import { Calendar, PackageMinus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { useSearchInput } from "@/hooks/use-search-input";
import { formatCurrency } from "@/lib/format";
import {
  getPartners,
  getOutgoing,
  addOutgoing,
  deleteOutgoing,
} from "@/database/partners";
import { Partner, PartnerOutgoing } from "@/types/partner";
import { PartnerTransactionLayout } from "./PartnerTransactionLayout";
import { groupPartnerTransactions } from "./utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function OutgoingPage() {
  const { toast } = useToast();
  const [partners] = useState<Partner[]>(() => getPartners());
  const [outgoingList, setOutgoingList] = useState<PartnerOutgoing[]>(() => getOutgoing());
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [outgoingToDelete, setOutgoingToDelete] = useState<PartnerOutgoing | null>(null);

  const [formPartnerId, setFormPartnerId] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const filteredOutgoing = useMemo(() => {
    return outgoingList.filter((x) => {
      const matchesSearch =
        x.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        x.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPartner = filterPartner === "all" || x.partnerId === filterPartner;
      return matchesSearch && matchesPartner;
    });
  }, [outgoingList, searchQuery, filterPartner]);

  const groupedOutgoing = useMemo(() => {
    return groupPartnerTransactions(filteredOutgoing);
  }, [filteredOutgoing]);

  const refreshOutgoing = () => {
    setOutgoingList(getOutgoing());
  };

  const resetForm = () => {
    setFormPartnerId("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormDescription("");
    setFormAmount("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const partner = partners.find((p) => p.id === formPartnerId);
    if (!partner) {
      toast({
        title: "Error",
        description: "Pilih mitra terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formDescription.trim()) {
      toast({
        title: "Error",
        description: "Deskripsi barang/uang yang diambil harus diisi",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Nominal nilai harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    addOutgoing({
      partnerId: partner.id,
      date: formDate,
      description: formDescription.trim(),
      totalValue: amount,
    });

    toast({ title: "Berhasil", description: "Pengambilan barang/uang berhasil dicatat" });
    setDialogOpen(false);
    resetForm();
    refreshOutgoing();
  };

  const handleDelete = () => {
    if (!outgoingToDelete) return;
    deleteOutgoing(outgoingToDelete.id);
    toast({ title: "Berhasil", description: "Riwayat pengambilan dihapus" });
    setDeleteDialogOpen(false);
    setOutgoingToDelete(null);
    refreshOutgoing();
  };

  return (
    <>
      <PartnerTransactionLayout
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Cari mitra / deskripsi..."
        isSearchDisabled={isSearchDisabled}
        filterPartner={filterPartner}
        setFilterPartner={setFilterPartner}
        partners={partners}
        actionButtonText="Catat Ambil"
        onAddClick={openAddDialog}
        isEmpty={groupedOutgoing.length === 0}
        emptyIcon={<PackageMinus className="w-12 h-12 mx-auto mb-3 opacity-20" />}
        emptyTitle={
          searchQuery || filterPartner !== "all"
            ? "Tidak ada pengambilan yang cocok"
            : "Belum ada transaksi pengambilan barang/uang dari mitra"
        }
        emptyDescription="Catat pengambilan barang (pupuk, bibit, kasbon) untuk memotong saldo buku mitra"
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteTitle="Hapus Riwayat Pengambilan?"
        deleteDescription={`Hapus catatan "${outgoingToDelete?.description}" senilai ${formatCurrency(outgoingToDelete?.totalValue || 0)}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirmDelete={handleDelete}
      >
        {groupedOutgoing.map((partnerData) => (
          <div key={partnerData.partnerId} className="border-b border-border/40 pb-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
              <h3 className="font-bold text-base text-foreground">
                {partnerData.partnerName}
              </h3>
              <span className="font-bold text-sm text-destructive font-mono">
                Total: -{formatCurrency(partnerData.total)}
              </span>
            </div>

            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-3">Tanggal</th>
                    <th className="text-left py-3 px-3">Barang / Deskripsi</th>
                    <th className="text-right py-3 px-3">Total Nilai</th>
                    <th className="text-center py-3 px-3 w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {partnerData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(item.date), "dd MMM yyyy", { locale: localeId })}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-foreground">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-destructive">
                        -{formatCurrency(item.totalValue)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setOutgoingToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          title="Hapus pengambilan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-border/30">
              {partnerData.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(item.date), "dd/MM/yy")}</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-destructive">
                      -{formatCurrency(item.totalValue)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0 mt-1"
                    onClick={() => {
                      setOutgoingToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </PartnerTransactionLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold">Catat Pengambilan Barang / Uang</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mitra *</Label>
              <Select value={formPartnerId} onValueChange={setFormPartnerId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih mitra..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tanggal *</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deskripsi / Barang yang Diambil *</Label>
              <Input
                placeholder="Contoh: Pupuk NPK 2 sak, Kasbon, Solar..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Nilai (Rp) *</Label>
              <PriceInput
                value={formAmount}
                onChange={setFormAmount}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 text-sm font-medium"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 h-10 text-sm font-medium"
              >
                Simpan Pengambilan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { OutgoingPage as PartnerOutgoingPage };
