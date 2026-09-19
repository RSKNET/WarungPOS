import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { toTitleCase, formatPhoneNumber } from "@/lib/text";
import { Store, Receipt, Settings2, Save, Printer, Eye, AlertTriangle } from "lucide-react";
import { ReceiptPreview } from "@/components/admin/ReceiptPreview";
import { BackupRestore } from "@/components/BackupRestore";
import { resetAllData } from "@/lib/backup";
import { printDocument } from "@/lib/native-bridge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  showLogo: boolean;
  taxEnabled: boolean;
  taxRate: number;
  paperWidth: "58" | "80";
}

const defaultSettings: StoreSettings = {
  storeName: "WarungPOS",
  storeAddress: "",
  storePhone: "",
  receiptFooter: "Terima kasih atas kunjungan Anda!",
  showLogo: true,
  taxEnabled: false,
  taxRate: 11,
  paperWidth: "58",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleResetProgram = async () => {
    try {
      await resetAllData(defaultSettings);
      toast({
        title: "Program Di-reset",
        description: "Seluruh data program telah dibersihkan kembali ke awal",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: "Reset Gagal",
        description: "Gagal membersihkan data program",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem("store-settings");
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("store-settings", JSON.stringify(settings));

    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Pengaturan Disimpan",
        description: "Perubahan pengaturan berhasil disimpan",
      });
    }, 500);
  };

  const updateSettings = (
    key: keyof StoreSettings,
    value: string | boolean | number,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestPrint = () => {
    const paperWidth = settings.paperWidth === "80" ? "80mm" : "58mm";
    const fontSize =
      settings.paperWidth === "80"
        ? { base: 12, small: 10, title: 16 }
        : { base: 10, small: 8, title: 14 };

    const testContent = `
      <div style="font-family: 'Courier New', monospace; width: ${paperWidth}; margin: 0; padding: 3mm;">
        <div style="text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: ${fontSize.title}px; font-weight: bold;">${settings.storeName}</h2>
          ${settings.storeAddress ? `<p style="margin: 3px 0 0; font-size: ${fontSize.small}px;">${settings.storeAddress}</p>` : ""}
          ${settings.storePhone ? `<p style="margin: 2px 0 0; font-size: ${fontSize.small}px;">Telp: ${settings.storePhone}</p>` : ""}
          <p style="margin: 5px 0 0; font-size: ${fontSize.small}px;">--- TEST PRINT ---</p>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="margin-bottom: 5px;">
            <p style="margin: 0; font-size: ${fontSize.base}px; font-weight: bold;">Contoh Produk 1</p>
            <div style="display: flex; justify-content: space-between; font-size: ${fontSize.small}px;">
              <span>2 x Rp 10.000</span>
              <span style="font-weight: bold;">Rp 20.000</span>
            </div>
          </div>
          <div style="margin-bottom: 5px;">
            <p style="margin: 0; font-size: ${fontSize.base}px; font-weight: bold;">Contoh Produk 2</p>
            <div style="display: flex; justify-content: space-between; font-size: ${fontSize.small}px;">
              <span>1 x Rp 15.000</span>
              <span style="font-weight: bold;">Rp 15.000</span>
            </div>
          </div>
        </div>

        <div style="border-top: 1px dashed #333; padding-top: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base + 2}px; font-weight: bold; margin-bottom: 4px;">
            <span>TOTAL</span>
            <span>Rp 35.000</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px; margin-bottom: 2px;">
            <span>Bayar</span>
            <span>Rp 50.000</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: ${fontSize.base}px;">
            <span>Kembali</span>
            <span style="font-weight: bold;">Rp 15.000</span>
          </div>
        </div>

        <div style="text-align: center; border-top: 1px dashed #333; padding-top: 8px;">
          <p style="margin: 0; font-size: ${fontSize.small}px;">${settings.receiptFooter}</p>
          <p style="margin: 5px 0 0; font-size: ${fontSize.small}px;">Ukuran kertas: ${paperWidth}</p>
        </div>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print - ${settings.storeName}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            @media print {
              html, body {
                width: ${paperWidth};
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 0;
              padding: 0;
              width: ${paperWidth};
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>${testContent}</body>
      </html>
    `;

    printDocument(html, `Test-Print-${settings.storeName.replace(/\s+/g, "-")}`);
  };

  return (
    <div className="space-y-6">

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-6">
          <BackupRestore />

          <div className="space-y-4 pb-6 border-b border-border/40">
            <div className="flex items-center gap-2.5 pb-1">
              <Store className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Informasi Toko</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Informasi dasar toko yang ditampilkan pada nota transaksi
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="storeName" className="text-sm font-medium">Nama Toko</Label>
                <Input
                  id="storeName"
                  value={settings.storeName}
                  onChange={(e) =>
                    updateSettings("storeName", toTitleCase(e.target.value))
                  }
                  placeholder="Nama toko Anda"
                  maxLength={50}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storeAddress" className="text-sm font-medium">Alamat</Label>
                <Textarea
                  id="storeAddress"
                  value={settings.storeAddress}
                  onChange={(e) =>
                    updateSettings("storeAddress", toTitleCase(e.target.value))
                  }
                  placeholder="Alamat lengkap toko"
                  rows={2}
                  maxLength={200}
                  className="text-sm min-h-[70px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storePhone" className="text-sm font-medium">Nomor Telepon</Label>
                <Input
                  id="storePhone"
                  value={settings.storePhone}
                  onChange={(e) =>
                    updateSettings(
                      "storePhone",
                      e.target.value.replace(/[^\d+\-\s]/g, ""),
                    )
                  }
                  onBlur={() => {
                    if (settings.storePhone.trim()) {
                      updateSettings(
                        "storePhone",
                        formatPhoneNumber(settings.storePhone),
                      );
                    }
                  }}
                  placeholder="08xxxxxxxxxx"
                  maxLength={20}
                  className="h-10 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Format otomatis disesuaikan ke format standar telepon
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pb-6 border-b border-border/40">
            <div className="flex items-center gap-2.5 pb-1">
              <Receipt className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Pengaturan Nota</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Kustomisasi format dan tampilan cetak nota printer thermal
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ukuran Kertas Thermal</Label>
                <RadioGroup
                  value={settings.paperWidth}
                  onValueChange={(value) => updateSettings("paperWidth", value)}
                  className="flex flex-col sm:flex-row gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="58" id="paper-58" />
                    <Label
                      htmlFor="paper-58"
                      className="text-sm font-normal cursor-pointer"
                    >
                      58mm (Kecil / Standar Portabel)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="80" id="paper-80" />
                    <Label
                      htmlFor="paper-80"
                      className="text-sm font-normal cursor-pointer"
                    >
                      80mm (Lebar / Desktop POS)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label htmlFor="showLogo" className="text-sm font-medium cursor-pointer">Tampilkan Logo</Label>
                  <p className="text-xs text-muted-foreground">
                    Tampilkan nama atau logo toko di bagian paling atas nota
                  </p>
                </div>
                <Switch
                  id="showLogo"
                  checked={settings.showLogo}
                  onCheckedChange={(checked) =>
                    updateSettings("showLogo", checked)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="receiptFooter" className="text-sm font-medium">Pesan Footer Nota</Label>
                <Textarea
                  id="receiptFooter"
                  value={settings.receiptFooter}
                  onChange={(e) =>
                    updateSettings("receiptFooter", e.target.value)
                  }
                  placeholder="Pesan yang ditampilkan di bagian bawah nota"
                  rows={2}
                  maxLength={100}
                  className="text-sm min-h-[70px]"
                />
              </div>

              <Button
                variant="outline"
                onClick={handleTestPrint}
                className="h-10 px-4 text-sm font-medium gap-2 w-full sm:w-auto"
              >
                <Printer className="w-4 h-4" />
                Test Cetak Nota
              </Button>
            </div>
          </div>

          <div className="space-y-4 pb-6 border-b border-border/40">
            <div className="flex items-center gap-2.5 pb-1">
              <Settings2 className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Pengaturan Pajak (PPN)</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Konfigurasi pembebanan pajak untuk setiap transaksi kasir</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label htmlFor="taxEnabled" className="text-sm font-medium cursor-pointer">Aktifkan Pajak</Label>
                  <p className="text-xs text-muted-foreground">
                    Tambahkan nominal persentase pajak ke setiap transaksi
                  </p>
                </div>
                <Switch
                  id="taxEnabled"
                  checked={settings.taxEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings("taxEnabled", checked)
                  }
                />
              </div>

              {settings.taxEnabled && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="taxRate" className="text-sm font-medium">Persentase Pajak (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) =>
                      updateSettings("taxRate", parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="h-10 text-sm max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <Eye className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-base font-bold text-foreground">Preview Struk</h2>
                <p className="text-xs text-muted-foreground">Tampilan simulasi hasil cetak</p>
              </div>
            </div>
            <ReceiptPreview settings={settings} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(true)}
              className="h-10 text-xs sm:text-sm font-medium gap-1.5 sm:gap-2 px-2.5 sm:px-4 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Reset Total</span>
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-10 text-xs sm:text-sm font-medium gap-1.5 sm:gap-2 px-2.5 sm:px-4 whitespace-nowrap"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{saving ? "Menyimpan..." : "Simpan"}</span>
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        variant="destructive"
        icon={<AlertTriangle className="w-5 h-5 text-destructive shrink-0" />}
        title="Konfirmasi Reset Aplikasi"
        confirmText="Ya, Reset Semua"
        description={
          <>
            <p>Apakah Anda benar-benar yakin ingin melakukan reset total aplikasi?</p>
            <p className="font-semibold text-destructive">
              ⚠️ Semua data produk, transaksi, hutang, data karyawan, dan pengaturan saat ini akan dihapus secara permanen dan tidak dapat dipulihkan.
            </p>
            <p>
              Pastikan Anda sudah mencadangkan (backup) data penting Anda terlebih dahulu.
            </p>
          </>
        }
        onConfirm={handleResetProgram}
      />
    </div>
  );
}

