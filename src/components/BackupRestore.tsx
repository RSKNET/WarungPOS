import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  AlertTriangle,
  Package,
  Users,
  ShoppingCart,
  Tag,
  CreditCard,
  Scale,
  ClipboardList,
  Handshake,
  Percent,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  downloadBackup,
  importBackup,
  getStorageStats,
  BackupModulesOptions,
} from "@/lib/backup";

export function BackupRestore() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stats, setStats] = useState<{
    products: number;
    transactions: number;
    categories: number;
    units: number;
    customers: number;
    debts: number;
    employees: number;
    shoppingItems: number;
    partners: number;
    markupRules: number;
  } | null>(null);

  const [backupOptions, setBackupOptions] = useState<BackupModulesOptions>({
    products: true,
    transactions: true,
    categories: true,
    units: true,
    customers: true,
    debts: true,
    employees: true,
    shoppingItems: true,
    partners: true,
    markupRules: true,
    storeSettings: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getStorageStats();
    setStats(data);
  };

  const toggleOption = (key: keyof BackupModulesOptions) => {
    setBackupOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAll = (value: boolean) => {
    setBackupOptions({
      products: value,
      transactions: value,
      categories: value,
      units: value,
      customers: value,
      debts: value,
      employees: value,
      shoppingItems: value,
      partners: value,
      markupRules: value,
      storeSettings: value,
    });
  };

  const handleExport = async () => {
    const hasSelected = Object.values(backupOptions).some(Boolean);
    if (!hasSelected) {
      toast({
        title: "Pilih Modul",
        description: "Pilih minimal satu modul untuk di-backup",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const res = await downloadBackup(backupOptions);
      toast({
        title: "Backup Berhasil",
        description: res?.savedInDownloads
          ? "File backup tersimpan di folder Download"
          : "File backup terenkripsi telah diunduh",
      });
    } catch (error) {
      toast({
        title: "Backup Gagal",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".wbak", ".json"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      toast({
        title: "File Tidak Valid",
        description: "Hanya file .wbak atau .json yang didukung",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setConfirmImport(true);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await importBackup(selectedFile);
      if (result.success) {
        toast({
          title: "Restore Berhasil",
          description: result.message,
        });
        await loadStats();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "Restore Gagal",
          description: result.message || "Gagal memulihkan data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Restore Gagal",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setConfirmImport(false);
      setSelectedFile(null);
    }
  };

  return (
    <>
      <div className="space-y-4 pb-6 border-b border-border/40">

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.products}</span>
              <span className="text-xs text-muted-foreground">produk</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.transactions}</span>
              <span className="text-xs text-muted-foreground">trx</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.categories}</span>
              <span className="text-xs text-muted-foreground">kategori</span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.units}</span>
              <span className="text-xs text-muted-foreground">satuan</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.customers}</span>
              <span className="text-xs text-muted-foreground">pelanggan</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.debts}</span>
              <span className="text-xs text-muted-foreground">hutang</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.employees}</span>
              <span className="text-xs text-muted-foreground">karyawan</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.shoppingItems}</span>
              <span className="text-xs text-muted-foreground">belanja</span>
            </div>
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.partners}</span>
              <span className="text-xs text-muted-foreground">mitra</span>
            </div>
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{stats.markupRules}</span>
              <span className="text-xs text-muted-foreground">markup</span>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pilih Modul yang Ingin Di-backup:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Pilih Semua
              </button>
              <span className="text-border text-xs">•</span>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-1">
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-products"
                checked={backupOptions.products}
                onCheckedChange={() => toggleOption("products")}
              />
              <Label htmlFor="b-products" className="text-sm cursor-pointer">Produk & Varian</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-txs"
                checked={backupOptions.transactions}
                onCheckedChange={() => toggleOption("transactions")}
              />
              <Label htmlFor="b-txs" className="text-sm cursor-pointer">Transaksi</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-categories"
                checked={backupOptions.categories}
                onCheckedChange={() => toggleOption("categories")}
              />
              <Label htmlFor="b-categories" className="text-sm cursor-pointer">Kategori</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-units"
                checked={backupOptions.units}
                onCheckedChange={() => toggleOption("units")}
              />
              <Label htmlFor="b-units" className="text-sm cursor-pointer">Satuan</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-customers"
                checked={backupOptions.customers}
                onCheckedChange={() => toggleOption("customers")}
              />
              <Label htmlFor="b-customers" className="text-sm cursor-pointer">Pelanggan & Hutang</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-employees"
                checked={backupOptions.employees}
                onCheckedChange={() => toggleOption("employees")}
              />
              <Label htmlFor="b-employees" className="text-sm cursor-pointer">Karyawan & Gaji</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-shopping"
                checked={backupOptions.shoppingItems}
                onCheckedChange={() => toggleOption("shoppingItems")}
              />
              <Label htmlFor="b-shopping" className="text-sm cursor-pointer">Daftar Belanja</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-partners"
                checked={backupOptions.partners}
                onCheckedChange={() => toggleOption("partners")}
              />
              <Label htmlFor="b-partners" className="text-sm cursor-pointer">Mitra Pengepul</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-markup"
                checked={backupOptions.markupRules}
                onCheckedChange={() => toggleOption("markupRules")}
              />
              <Label htmlFor="b-markup" className="text-sm cursor-pointer">Aturan Harga</Label>
            </div>
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="b-settings"
                checked={backupOptions.storeSettings}
                onCheckedChange={() => toggleOption("storeSettings")}
              />
              <Label htmlFor="b-settings" className="text-sm cursor-pointer">Pengaturan Toko</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="h-10 text-xs sm:text-sm font-medium gap-1.5 sm:gap-2 px-2.5 sm:px-4 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isExporting ? "Mengunduh..." : "Backup Data"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-10 text-xs sm:text-sm font-medium gap-1.5 sm:gap-2 px-2.5 sm:px-4 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>{isImporting ? "Memulihkan..." : "Restore Data"}</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".wbak,.json,application/octet-stream,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex items-start gap-2.5 pt-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground font-medium">Tips:</strong> Lakukan backup secara berkala ke penyimpanan aman (Google Drive atau Flashdisk) untuk mengantisipasi saat mengganti perangkat atau membersihkan riwayat browser.
          </p>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        title="Konfirmasi Restore Data"
        description={
          <div className="space-y-2 text-sm">
            <p>Anda akan memulihkan data dari file backup:</p>
            <p className="font-semibold text-foreground">
              {selectedFile?.name}
            </p>
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Semua data saat ini akan ditimpa dengan data dari file backup ini.
            </p>
            <p>
              Pastikan Anda sudah mencadangkan data saat ini sebelum melanjutkan.
            </p>
          </div>
        }
        confirmText="Ya, Restore Data"
        onConfirm={handleImport}
        onCancel={() => setSelectedFile(null)}
      />
    </>
  );
}

