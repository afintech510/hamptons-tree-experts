"use client";

import { PriceDisplay } from "./PriceDisplay";

interface TierOption {
  total_cents: number;
  available: boolean;
}

interface UrgencyTierSelectorProps {
  tierPrices: Record<string, TierOption>;
  selected: string | null;
  onSelect: (tier: string) => void;
}

const TIER_META: Record<string, { label: string; description: string }> = {
  tomorrow: {
    label: "Tomorrow",
    description: "Next-day service (order before 4pm ET)",
  },
  "2_5_day": {
    label: "2–5 Days",
    description: "Scheduled within the week",
  },
  "6_14_day": {
    label: "6–14 Days",
    description: "Standard scheduling",
  },
};

const TIER_ORDER = ["tomorrow", "2_5_day", "6_14_day"];

export function UrgencyTierSelector({
  tierPrices,
  selected,
  onSelect,
}: UrgencyTierSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-warm-gray-700">
        Urgency
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const price = tierPrices[tier];
          const meta = TIER_META[tier];
          if (!price || !meta) return null;

          const isSelected = selected === tier;
          const isDisabled = !price.available;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => !isDisabled && onSelect(tier)}
              disabled={isDisabled}
              className={`relative rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? "border-rust bg-rust/5"
                  : isDisabled
                    ? "cursor-not-allowed border-warm-gray-100 bg-warm-gray-50 opacity-60"
                    : "border-warm-gray-200 hover:border-warm-gray-300"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-sm font-semibold ${isSelected ? "text-rust" : "text-warm-gray-700"}`}
                >
                  {meta.label}
                </span>
                <PriceDisplay
                  cents={price.total_cents}
                  className={`text-lg ${isSelected ? "text-rust" : "text-warm-gray-800"}`}
                />
              </div>
              <p className="mt-1 text-xs text-warm-gray-400">
                {isDisabled ? "Unavailable" : meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
