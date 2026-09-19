import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        reg.update();

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShowUpdate(true);
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setShowUpdate(true);
          setRegistration(reg);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 opacity-70 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Pembaruan Tersedia</h3>
          <p className="text-xs opacity-90 mt-1">
            Versi baru aplikasi tersedia. Update sekarang untuk fitur terbaru.
          </p>
          <p className="text-xs opacity-75 mt-1">
            💡 Data Anda aman, tidak akan hilang saat update.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            onClick={handleUpdate}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}

