import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive" | "warning";
  icon?: React.ReactNode;
  contentClassName?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Konfirmasi",
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  loadingText = "Memproses...",
  isLoading = false,
  variant = "default",
  icon,
  contentClassName,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    onConfirm();
    if (!isLoading) {
      onOpenChange?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isLoading) return;
    const target = e.target as HTMLElement;
    const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
    const isButton = target?.tagName === "BUTTON";

    if (e.key === "Enter") {
      if (isButton) return;
      e.preventDefault();
      handleConfirm();
    } else if (!isInput && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      handleConfirm();
    } else if (!isInput && (e.key === "n" || e.key === "N" || e.key === "x" || e.key === "X")) {
      e.preventDefault();
      handleCancel();
    }
  };

  const getActionStyle = () => {
    if (variant === "destructive") {
      return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
    }
    if (variant === "warning") {
      return "bg-amber-600 text-white hover:bg-amber-700";
    }
    return "";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn("sm:max-w-md", contentClassName)}
        onKeyDown={handleKeyDown}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-bold">
            {icon}
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription asChild={typeof description !== "string"} className="text-sm text-muted-foreground space-y-2">
              {typeof description === "string" ? (
                description
              ) : (
                <div>{description}</div>
              )}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row items-center justify-end gap-2.5 pt-2 sm:gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-initial mt-0 h-10 px-4 text-sm font-medium"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 sm:flex-initial h-10 px-4 text-sm font-medium",
              getActionStyle(),
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingText}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Hapus Data?",
  description = "Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Hapus",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant={isDestructive ? "destructive" : "default"}
      icon={
        isDestructive ? (
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        ) : undefined
      }
    />
  );
}

export interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive" | "warning";
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title = "Konfirmasi Aksi",
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  loadingText,
  isLoading,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      loadingText={loadingText}
      isLoading={isLoading}
      variant={variant}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

