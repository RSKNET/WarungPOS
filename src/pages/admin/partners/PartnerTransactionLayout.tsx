import React from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { Partner } from "@/types/partner";

export interface PartnerTransactionLayoutProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  isSearchDisabled?: boolean;
  filterPartner: string;
  setFilterPartner: (partnerId: string) => void;
  partners: Partner[];
  actionButtonText: string;
  onAddClick: () => void;
  extraFilterSlot?: React.ReactNode;
  isEmpty: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteTitle: string;
  deleteDescription: string;
  onConfirmDelete: () => void;
  children: React.ReactNode;
}

export function PartnerTransactionLayout({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Cari mitra...",
  isSearchDisabled = false,
  filterPartner,
  setFilterPartner,
  partners,
  actionButtonText,
  onAddClick,
  extraFilterSlot,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  deleteDialogOpen,
  setDeleteDialogOpen,
  deleteTitle,
  deleteDescription,
  onConfirmDelete,
  children,
}: PartnerTransactionLayoutProps) {
  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              maxLength={50}
              disabled={isSearchDisabled}
            />
          </div>
          <Button
            onClick={onAddClick}
            className="h-10 px-4 text-sm font-medium gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{actionButtonText}</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Semua Mitra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mitra</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {extraFilterSlot}
        </div>
      </div>

      {isEmpty ? (
        <div className="py-16 text-center text-muted-foreground w-full">
          {emptyIcon}
          <p className="text-base font-medium">{emptyTitle}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-6 w-full">{children}</div>
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
