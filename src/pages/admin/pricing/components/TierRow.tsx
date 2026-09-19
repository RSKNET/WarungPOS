import React from "react";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { TierInput } from "../types";
import { MarkupType } from "@/types/markup";

interface TierRowProps {
  tier: TierInput;
  index: number;
  batchMarkupType: MarkupType;
  updateTier: (id: string, field: keyof TierInput, value: any) => void;
  removeTier: (id: string) => void;
}

export function TierRow({
  tier,
  index,
  batchMarkupType,
  updateTier,
  removeTier,
}: TierRowProps) {
  return (
    <div className="py-3.5 first:pt-2 last:pb-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-1">
          {index + 1}
        </div>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Harga Min</Label>
              <PriceInput
                value={tier.minPrice}
                onChange={(v) => updateTier(tier.id, "minPrice", v)}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Harga Max</Label>
              <PriceInput
                value={tier.maxPrice}
                onChange={(v) => updateTier(tier.id, "maxPrice", v)}
                placeholder="Tidak terbatas"
                disabled={tier.noMaxLimit}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`noLimit-${tier.id}`}
              checked={tier.noMaxLimit}
              onChange={(e) =>
                updateTier(tier.id, "noMaxLimit", e.target.checked)
              }
              className="rounded border-input h-4 w-4"
            />
            <Label
              htmlFor={`noLimit-${tier.id}`}
              className="text-xs sm:text-sm font-normal cursor-pointer"
            >
              Tidak ada batas maksimum (ke atas)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {batchMarkupType === "percent" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Satuan (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="100"
                    value={tier.retailMarkup}
                    onChange={(e) =>
                      updateTier(tier.id, "retailMarkup", e.target.value)
                    }
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Grosir (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="50"
                    value={tier.wholesaleMarkup}
                    onChange={(e) =>
                      updateTier(tier.id, "wholesaleMarkup", e.target.value)
                    }
                    className="h-10 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Satuan (Rp)
                  </Label>
                  <PriceInput
                    value={tier.retailMarkupFixed}
                    onChange={(v) =>
                      updateTier(tier.id, "retailMarkupFixed", v)
                    }
                    placeholder="5.000"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Markup Grosir (Rp)
                  </Label>
                  <PriceInput
                    value={tier.wholesaleMarkupFixed}
                    onChange={(v) =>
                      updateTier(tier.id, "wholesaleMarkupFixed", v)
                    }
                    placeholder="3.000"
                    className="h-10 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeTier(tier.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export { TierRow as PricingTierRow };

