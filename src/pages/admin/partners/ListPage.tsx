import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Phone, MapPin, Users } from "lucide-react";
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
import {
  getPartners,
  addPartner,
  updatePartner,
  deletePartner,
} from "@/database/partners";
import { Partner } from "@/types/partner";
import { sortAlpha } from "@/lib/sorting";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ListPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>(() => getPartners());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, isSearchDisabled } = useSearchInput([
    dialogOpen,
    deleteDialogOpen,
  ]);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const filteredPartners = sortAlpha(
    partners.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery)) ||
        (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())),
    ),
    "name",
  );

  const refreshPartners = () => {
    setPartners(getPartners());
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setEditingPartner(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormName(partner.name);
    setFormPhone(partner.phone || "");
    setFormAddress(partner.address || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Nama mitra harus diisi",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: toTitleCase(formName.trim()),
      phone: formPhone.trim() ? formatPhoneNumber(formPhone.trim()) : undefined,
      address: formAddress.trim() || undefined,
    };

    if (editingPartner) {
      updatePartner(editingPartner.id, data);
      toast({ title: "Berhasil", description: "Data mitra diperbarui" });
    } else {
      addPartner(data);
      toast({ title: "Berhasil", description: "Mitra baru ditambahkan" });
    }

    setDialogOpen(false);
    resetForm();
    refreshPartners();
  };

  const handleDelete = () => {
    if (!partnerToDelete) return;
    deletePartner(partnerToDelete.id);
    toast({ title: "Berhasil", description: "Mitra berhasil dihapus" });
    setDeleteDialogOpen(false);
    setPartnerToDelete(null);
    refreshPartners();
  };

  return (
    <div className="space-y-6 w-full">

      <div className="flex items-center justify-between gap-2.5 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cari dari ${partners.length} mitra...`}
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
          <span className="hidden sm:inline">Tambah Mitra</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {filteredPartners.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">
            {searchQuery
              ? "Tidak ada mitra yang cocok"
              : "Belum ada data mitra pelanggan (kolektor)"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tambahkan mitra baru untuk mengelola setoran dan mutasi buku
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden sm:block overflow-x-auto w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-3">Mitra</th>
                  <th className="text-left py-3 px-3">Telepon</th>
                  <th className="text-left py-3 px-3">Alamat</th>
                  <th className="text-right py-3 px-3 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-muted/20 transition-colors group cursor-pointer"
                    onClick={() => openEditDialog(partner)}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(partner.name)}
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                          {partner.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">
                      {partner.phone ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90 font-mono">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {partner.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">
                      {partner.address ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{partner.address}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
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
                          onClick={() => openEditDialog(partner)}
                          title="Edit mitra"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setPartnerToDelete(partner);
                            setDeleteDialogOpen(true);
                          }}
                          title="Hapus mitra"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border/30 w-full">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="py-3.5 px-1 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                onClick={() => openEditDialog(partner)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(partner.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {partner.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {partner.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" />
                          {partner.phone}
                        </span>
                      )}
                      {partner.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {partner.address}
                        </span>
                      )}
                    </div>
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
                    onClick={() => openEditDialog(partner)}
                    title="Edit mitra"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setPartnerToDelete(partner);
                      setDeleteDialogOpen(true);
                    }}
                    title="Hapus mitra"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingPartner ? "Edit Data Mitra" : "Tambah Mitra Pengepul"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Nama Mitra *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama lengkap mitra"
                maxLength={50}
                className="h-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium">Alamat</Label>
                <Input
                  id="address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Alamat domisili"
                  maxLength={100}
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
              {editingPartner ? "Simpan Perubahan" : "Tambah Mitra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Mitra Pengepul?"
        description={`Apakah Anda yakin ingin menghapus mitra "${partnerToDelete?.name}"? Tindakan ini akan menghapus semua riwayat transaksi setoran dan pengambilan terkait.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

