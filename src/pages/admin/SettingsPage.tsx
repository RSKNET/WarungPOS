import { useState, useEffect, useCallback } from "react";
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
  isBluetoothEnabled,
  requestEnableBluetooth,
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
  const [btEnabled, setBtEnabled] = useState<boolean>(true);
  const isApk = typeof window !== "undefined" && !!window.AndroidBridge;

  const refreshBluetoothState = useCallback(async (showAll = showAllBluetooth) => {
    if (!isApk) return;
    const enabled = isBluetoothEnabled();
    setBtEnabled(enabled);
    if (!enabled) {
      setPrinters([]);
      return;
    }
    setLoadingPrinters(true);
    try {
      const list = await getPairedBluetoothPrinters(showAll);
      setPrinters(list);
      if (list.length === 1 && !settings.selectedPrinterMac) {
        setSettings((prev) => ({
          ...prev,
          selectedPrinterMac: list[0].mac,
          selectedPrinterName: list[0].name,
        }));
      }
    } catch {
      setPrinters([]);
    } finally {
      setLoadingPrinters(false);
    }
  }, [isApk, showAllBluetooth, settings.selectedPrinterMac]);

  const handleRequestEnableBluetooth = () => {
    requestEnableBluetooth();
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (isBluetoothEnabled()) {
        setBtEnabled(true);
        refreshBluetoothState();
        clearInterval(interval);
      } else if (count > 20) {
        clearInterval(interval);
      }
    }, 400);
  };

  useEffect(() => {
    if (isApk) {
      setConnectedMac(getConnectedPrinterMac());
      refreshBluetoothState();

      const handleFocus = () => {
        refreshBluetoothState();
        setConnectedMac(getConnectedPrinterMac());
      };

      const handlePermGranted = () => {
        refreshBluetoothState();
      };

      const handleBtStateChanged = (e: Event) => {
        const customEvent = e as CustomEvent<{ enabled: boolean }>;
        const isNowEnabled = customEvent.detail?.enabled ?? isBluetoothEnabled();
        setBtEnabled(isNowEnabled);
        if (isNowEnabled) {
          refreshBluetoothState();
        } else {
          setPrinters([]);
        }
      };

      window.addEventListener("focus", handleFocus);
      window.addEventListener("bluetoothPermissionGranted", handlePermGranted);
      window.addEventListener("bluetoothStateChanged", handleBtStateChanged);

      return () => {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("bluetoothPermissionGranted", handlePermGranted);
        window.removeEventListener("bluetoothStateChanged", handleBtStateChanged);
      };
    }
  }, [isApk, refreshBluetoothState]);

  const handleConnect = async (mac: string) => {
    if (!mac) return;
    if (isApk && !isBluetoothEnabled()) {
      handleRequestEnableBluetooth();
      toast({
        title: "Bluetooth Belum Aktif",
        description: "Mengaktifkan Bluetooth perangkat...",
      });
      return;
    }
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),360px] min-w-0">
        <div className="space-y-6 min-w-0">
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
                  Kustomisasi format dan pencetakan nota thermal 58mm
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="printerSelect" className="text-sm font-medium">Printer Thermal (Bluetooth)</Label>
                    {isApk && (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        connectedMac
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connectedMac ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                        {connectedMac ? "Terhubung" : "Terputus"}
                      </span>
                    )}
                  </div>

                  {isApk && btEnabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshBluetoothState(showAllBluetooth)}
                      disabled={loadingPrinters}
                      className="h-7 px-2 text-xs text-primary gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPrinters ? "animate-spin" : ""}`} />
                      <span>{loadingPrinters ? "Memuat..." : "Segarkan"}</span>
                    </Button>
                  )}
                </div>

                {!isApk ? (
                  <p className="text-xs text-muted-foreground">
                    Berjalan di mode browser (dialog print Ctrl+P). Untuk koneksi langsung printer thermal via Bluetooth tanpa dialog, gunakan aplikasi Android (APK).
                  </p>
                ) : !btEnabled ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Bluetooth className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Bluetooth tidak aktif di perangkat ini</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRequestEnableBluetooth}
                      className="h-8 text-xs font-medium gap-1.5 shrink-0"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>Aktifkan Bluetooth</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0 w-full">
                    <div className="flex gap-2 w-full min-w-0">
                      <select
                        id="printerSelect"
                        value={settings.selectedPrinterMac || ""}
                        onChange={(e) => {
                          const mac = e.target.value;
                          const found = printers.find((p) => p.mac === mac);
                          updateSettings("selectedPrinterMac", mac);
                          updateSettings("selectedPrinterName", found ? found.name : "");
                        }}
                        className="flex-1 min-w-0 w-0 h-10 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
                      >
                        <option value="">-- Pilih Perangkat Printer --</option>
                        {printers.map((p) => {
                          const displayName = p.name && p.name.length > 25 ? `${p.name.slice(0, 25)}…` : (p.name || "Perangkat Tanpa Nama");
                          return (
                            <option key={p.mac} value={p.mac}>
                              {displayName} ({p.mac}) {p.isPrinter ? "🖨️" : ""}
                            </option>
                          );
                        })}
                      </select>

                      {connectedMac ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnect}
                          className="h-10 text-xs sm:text-sm text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0"
                        >
                          Putus
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!settings.selectedPrinterMac || connectingPrinter}
                          onClick={() => {
                            if (settings.selectedPrinterMac) {
                              handleConnect(settings.selectedPrinterMac);
                            }
                          }}
                          className="h-10 text-xs sm:text-sm gap-1.5 shrink-0"
                        >
                          <Bluetooth className="w-4 h-4" />
                          <span>{connectingPrinter ? "Menghubungkan..." : "Hubungkan"}</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-0.5 min-w-0">
                      <span className="min-w-0 flex-1 truncate">
                        {printers.length === 0 && !loadingPrinters
                          ? "⚠️ Printer belum di-pairing di HP"
                          : `${printers.length} perangkat terdeteksi`}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          id="showAllBt"
                          checked={showAllBluetooth}
                          onCheckedChange={(checked) => {
                            setShowAllBluetooth(checked);
                            refreshBluetoothState(checked);
                          }}
                        />
                        <Label htmlFor="showAllBt" className="text-xs text-muted-foreground cursor-pointer">
                          Semua device
                        </Label>
                      </div>
                    </div>
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

