import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoModal({
  photoUrl,
  onClose,
}: PhotoModalProps) {
  return (
    <Dialog open={!!photoUrl} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Foto Produk</DialogTitle>
        </DialogHeader>
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Foto produk"
            className="w-full rounded-lg object-contain max-h-[80vh]"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { PhotoModal as ShoppingPhotoModal };

