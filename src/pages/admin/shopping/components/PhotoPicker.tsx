import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { convertToWebP } from "@/lib/image-utils";
import { toast } from "@/hooks/use-toast";

interface PhotoPickerProps {
  photo?: string | null;
  onPhotoChange: (photo: string | null) => void;
  size?: "sm" | "md";
}

export function PhotoPicker({
  photo,
  onPhotoChange,
  size = "md",
}: PhotoPickerProps) {
  const handleFile = async (file: File) => {
    try {
      const webp = await convertToWebP(file);
      onPhotoChange(webp);
    } catch {
      toast({
        title: "Error",
        description: "Gagal memproses gambar",
        variant: "destructive",
      });
    }
  };

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  const openCamera = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  if (photo) {
    return (
      <div className="relative inline-block">
        <img
          src={photo}
          alt="Product"
          className={
            size === "sm"
              ? "w-14 h-14 object-cover rounded-lg border border-border/40"
              : "w-20 h-20 object-cover rounded-lg border border-border/40"
          }
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className={
            size === "sm"
              ? "absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
              : "absolute -top-2 -right-2 h-6 w-6 rounded-full"
          }
          onClick={() => onPhotoChange(null)}
        >
          <X className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        className={size === "sm" ? "gap-1.5 text-xs h-9" : "h-10 px-4 text-sm font-medium gap-2"}
        onClick={openGallery}
      >
        <ImageIcon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        Galeri
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        className={size === "sm" ? "gap-1.5 text-xs h-9" : "h-10 px-4 text-sm font-medium gap-2"}
        onClick={openCamera}
      >
        <Camera className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        Kamera
      </Button>
    </div>
  );
}

export { PhotoPicker as ProductPhotoPicker };
export type { PhotoPickerProps, PhotoPickerProps as ProductPhotoPickerProps };
