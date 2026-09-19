import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Calendar, Filter, PackageMinus } from "lucide-react";
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
  getPartners,
  getOutgoing,
  addOutgoing,
  deleteOutgoing,
} from "@/database/partners";
import { Partner, PartnerOutgoing } from "@/types/partner";
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
    const grouped: Record<
      string,
      {
        partnerName: string;
        items: PartnerOutgoing[];
        total: number;
      }
    > = {};

    filteredOutgoing.forEach((item) => {
      if (!grouped[item.partnerId]) {
        grouped[item.partnerId] = {
          partnerName: item.partnerName,
          items: [],
          total: 0,
        };
      }
      grouped[item.partnerId].items.push(item);
      grouped[item.partnerId].total += item.totalValue;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.partnerName.localeCompare(b.partnerName))
      .map(([partnerId, data]) => ({
        partnerId,
        ...data,
      }));
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
    <div className="space-y-6 w-full">

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari mitra / deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>

          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="h-10 text-sm w-[150px] sm:w-[190px] shrink-0">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Semua Mitra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mitra</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={openAddDialog}
          className="h-10 px-4 text-sm font-medium gap-2 shrink-0 sm:ml-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Ambil</span>
        </Button>
      </div>

      {groupedOutgoing.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <PackageMinus className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery || filterPartner !== "all"
              ? "Tidak ada pengambilan yang cocok"
              : "Belum ada transaksi pengambilan barang/uang dari mitra"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Catat pengambilan barang (pupuk, bibit, kasbon) untuk memotong saldo buku mitra
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">
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

              <div className="sm:hidden divide-y divide-border/30 w-full">
                {partnerData.items.map((item) => (
                  <div key={item.id} className="py-3 px-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {item.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.date), "dd/MM/yy", { locale: localeId })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-bold text-sm text-destructive font-mono">
                        -{formatCurrency(item.totalValue)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setOutgoingToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle className="text-lg font-bold">Catat Ambil Barang / Uang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Mitra Pengepul *</Label>
                <Select value={formPartnerId} onValueChange={setFormPartnerId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Pilih mitra" />
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deskripsi Pengambilan *</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Misal: Pupuk Urea 2 sak, Bibit, atau Pinjam Kas"
                maxLength={100}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Nilai Barang/Uang *</Label>
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
              Simpan Transaksi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Riwayat Pengambilan?"
        description={
          <>
            Apakah Anda yakin ingin menghapus data pengambilan{" "}
            <strong className="text-foreground">"{outgoingToDelete?.description}"</strong> senilai{" "}
            <strong className="text-foreground">{formatCurrency(outgoingToDelete?.totalValue || 0)}</strong> untuk{" "}
            <strong className="text-foreground">{outgoingToDelete?.partnerName}</strong>? Tindakan ini akan mempengaruhi saldo buku.
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

