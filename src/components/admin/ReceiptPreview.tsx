import { useRef } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { saveImageToDevice } from "@/lib/native-bridge";
import { ReceiptPaper, StoreSettingsData } from "@/components/Receipt";

export interface ReceiptPreviewProps {
  settings: StoreSettingsData;
}

export function ReceiptPreview({ settings }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const sampleItems = [
    { name: "Indomie Goreng", qty: 2, price: 3500, total: 7000 },
    { name: "Teh Botol", qty: 1, price: 5000, total: 5000 },
    { name: "Roti Tawar", qty: 1, price: 15000, total: 15000 },
  ];

  const subtotal = sampleItems.reduce((sum, item) => sum + item.total, 0);
  const tax = settings.taxEnabled
    ? Math.round((subtotal * (settings.taxRate || 0)) / 100)
    : 0;
  const total = subtotal + tax;
  const payment = 50000;
  const change = payment - total;

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSaveAsPng = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
      });

      const filename = `struk-preview-${Date.now()}.png`;
      saveImageToDevice(canvas.toDataURL("image/png"), filename, "Image");

      toast({
        title: "Struk Disimpan",
        description: window.AndroidBridge
          ? "Preview struk berhasil disimpan di Download/WarungPOS/Image/"
          : "Preview struk berhasil disimpan sebagai gambar PNG",
      });
    } catch (error) {
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan struk",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/20 border-y border-border/40 p-4 flex justify-center">
        <ReceiptPaper
          ref={receiptRef}
          settings={settings}
          transactionId="TRX12345"
          dateStr={currentDate}
          items={sampleItems}
          subtotal={subtotal}
          tax={tax}
          total={total}
          payment={payment}
          change={change}
        />
      </div>

      <Button
        variant="outline"
        className="w-full h-10 text-sm font-medium gap-2"
        onClick={handleSaveAsPng}
      >
        <Download className="w-4 h-4" />
        Simpan sebagai PNG
      </Button>
    </div>
  );
}
