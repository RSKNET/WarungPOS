import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { toTitleCase, formatPhoneNumber } from "@/lib/text";
import {
  Store,
  Receipt,
  Settings2,
  Save,
  Printer,
  Eye,
  AlertTriangle,
  Bluetooth,
  RefreshCw,
} from "lucide-react";
import { ReceiptPreview } from "@/components/Receipt";
import { BackupRestore } from "@/components/BackupRestore";
import { resetAllData } from "@/lib/backup";
import { executeThermalPrint } from "@/lib/thermal-printer";
import {
  getPairedBluetoothPrinters,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getConnectedPrinterMac,
  BluetoothDeviceType,
} from "@/lib/native-bridge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  taxEnabled: boolean;
  taxRate: number;
  receiptTemplate?: "compact";
  selectedPrinterMac?: string;
  selectedPrinterName?: string;
}

const defaultSettings: StoreSettings = {
  storeName: "WarungPOS",
  storeAddress: "",
  storePhone: "",
  receiptFooter: "Terima kasih atas kunjungan Anda!",
  taxEnabled: false,
  taxRate: 11,
  receiptTemplate: "compact",
  selectedPrinterMac: "",
  selectedPrinterName: "",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [printers, setPrinters] = useState<BluetoothDeviceType[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [showAllBluetooth, setShowAllBluetooth] = useState(false);
  const [connectedMac, setConnectedMac] = useState<string>("");
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const isApk = typeof window !== "undefined" && !!window.AndroidBridge;

  const loadPrinters = async (showAll: boolean) => {
    setLoadingPrinters(true);
    try {
      const list = await getPairedBluetoothPrinters(showAll);
      setPrinters(list);
    } catch {
      setPrinters([]);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    if (isApk) {
      setConnectedMac(getConnectedPrinterMac());
      loadPrinters(false);
    }
  }, [isApk]);

  const handleConnect = async (mac: string) => {
    if (!mac) return;
    setConnectingPrinter(true);
    try {
      const ok = await connectBluetoothPrinter(mac);
      if (ok) {
        setConnectedMac(mac);
        toast({
          title: "Printer Terhubung",
          description: `Berhasil terhubung ke ${settings.selectedPrinterName || mac}`,
        });
      } else {
        toast({
          title: "Gagal Menghubungkan",
          description: "Pastikan printer menyala, Bluetooth aktif, dan berada dalam jangkauan.",
          variant: "destructive",
        });
      }
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectBluetoothPrinter();
    setConnectedMac("");
    toast({
      title: "Printer Terputus",
      description: "Koneksi printer Bluetooth berhasil diputus",
    });
  };

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

  const handleTestPrint = async () => {
    await executeThermalPrint({
      settings,
      title: `Test-Print-${(settings.storeName || "WarungPOS").replace(/\s+/g, "-")}`,
      dateStr: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: [
        { name: "Contoh Produk 1", qty: 2, price: 10000, total: 20000 },
        { name: "Contoh Produk 2", qty: 1, price: 15000, total: 15000 },
      ],
      total: 35000,
      payment: 50000,
      change: 15000,
      paymentType: "cash",
      isTest: true,
    });
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <span className="text-muted-foreground font-medium">Ukuran Kertas Nota</span>
                <span className="font-semibold text-foreground">58mm (Standar Thermal)</span>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bluetooth className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <Label className="text-sm font-semibold">Printer Thermal Bluetooth</Label>
                      <p className="text-xs text-muted-foreground">Koneksi langsung tanpa dialog print (SPP / ESC-POS)</p>
                    </div>
                  </div>
                  {isApk ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          connectedMac ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                        }`}
                      />
                      <span className={connectedMac ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}>
                        {connectedMac ? "Terhubung" : "Terputus"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      Web Browser
                    </span>
                  )}
                </div>

                {!isApk ? (
                  <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40 space-y-1">
                    <p className="font-medium text-foreground">ℹ️ Berjalan di Mode Browser</p>
                    <p>
                      Pencetakan nota menggunakan dialog bawaan browser (Ctrl+P / Spooler).
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Untuk koneksi langsung ke printer thermal portabel via Bluetooth (SPP) tanpa dialog, jalankan melalui <strong>aplikasi Android (APK) WarungPOS</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="printerSelect" className="text-xs font-medium text-foreground">
                          Pilih Printer Terpasang (Paired)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => loadPrinters(showAllBluetooth)}
                          disabled={loadingPrinters}
                          className="h-6 px-2 text-xs text-primary gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingPrinters ? "animate-spin" : ""}`} />
                          <span>{loadingPrinters ? "Memuat..." : "Segarkan"}</span>
                        </Button>
                      </div>

                      <select
                        id="printerSelect"
                        value={settings.selectedPrinterMac || ""}
                        onChange={(e) => {
                          const mac = e.target.value;
                          const found = printers.find((p) => p.mac === mac);
                          updateSettings("selectedPrinterMac", mac);
                          updateSettings("selectedPrinterName", found ? found.name : "");
                        }}
                        className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="">-- Pilih Perangkat Printer --</option>
                        {printers.map((p) => (
                          <option key={p.mac} value={p.mac}>
                            {p.name || "Perangkat Tanpa Nama"} ({p.mac}) {p.isPrinter ? "🖨️" : ""}
                          </option>
                        ))}
                      </select>

                      {printers.length === 0 && !loadingPrinters && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ Tidak ada printer thermal yang ditemukan. Pastikan printer telah dinyalakan & di-pairing di menu Pengaturan Bluetooth HP Anda terlebih dahulu.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        {connectedMac ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            Putus Koneksi
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            disabled={!settings.selectedPrinterMac || connectingPrinter}
                            onClick={() => {
                              if (settings.selectedPrinterMac) {
                                handleConnect(settings.selectedPrinterMac);
                              }
                            }}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Bluetooth className="w-3.5 h-3.5" />
                            <span>{connectingPrinter ? "Menghubungkan..." : "Hubungkan Printer"}</span>
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="showAllBt"
                          checked={showAllBluetooth}
                          onCheckedChange={(checked) => {
                            setShowAllBluetooth(checked);
                            loadPrinters(checked);
                          }}
                        />
                        <Label htmlFor="showAllBt" className="text-xs text-muted-foreground cursor-pointer">
                          Tampilkan semua device
                        </Label>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      *Secara default TWS, headset, speaker, dan HP lain otomatis difilter keluar. Aktifkan switch di atas bila printer Anda tidak terdeteksi otomatis.
                    </p>
                  </div>
                )}
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

