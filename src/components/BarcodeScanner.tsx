import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (sku: string) => void;
  onReady?: () => void;
  title?: string;
}

const SCANNER_ID = "barcode-scanner-preview";

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
  onReady,
  title = "Scan Barcode",
}: BarcodeScannerProps) {
  const [isReady, setIsReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        void 0;
      }
      try {
        scannerRef.current.clear();
      } catch {
        void 0;
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setIsReady(false);
      stopScanner();
      detectedRef.current = false;
      return;
    }

    setIsReady(false);

    const timer = setTimeout(() => {
      const element = document.getElementById(SCANNER_ID);
      if (!element) return;

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      detectedRef.current = false;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 120 } },
          (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            onDetected(decodedText.trim());
            stopScanner().then(onClose);
          },
          () => {}
        )
        .then(() => {
          setIsReady(true);
          onReady?.();
        })
        .catch((err) => {
          console.error("Gagal memulai kamera:", err);
          setIsReady(false);
          onClose();
        });
    }, 50);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, onDetected, onClose, onReady, stopScanner]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setIsReady(false);
          stopScanner().then(onClose);
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 transition-opacity duration-200",
            isReady ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 rounded-lg overflow-hidden transition-all",
            isReady
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <div className="flex flex-col space-y-1.5 px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </DialogPrimitive.Title>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsReady(false);
                  stopScanner().then(onClose);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="px-4 pb-2">
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Arahkan kamera ke barcode produk
            </DialogPrimitive.Description>
          </div>

          <div className="relative bg-black mx-4 mb-4 rounded-lg overflow-hidden h-[200px]">
            <div
              id={SCANNER_ID}
              className="w-full h-full"
            />

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-primary rounded-sm w-[240px] h-[120px] relative">
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-sm" />

                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 animate-scan" />
              </div>
            </div>
          </div>

          <style>{`
            #${SCANNER_ID} {
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
              position: relative !important;
            }
            #${SCANNER_ID} video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 0.5rem !important;
            }
            #${SCANNER_ID} #qr-shaded-region {
              display: none !important;
            }
            @keyframes scan {
              0%   { transform: translateY(0); }
              50%  { transform: translateY(118px); }
              100% { transform: translateY(0); }
            }
            .animate-scan {
              animation: scan 2s ease-in-out infinite;
            }
          `}</style>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

