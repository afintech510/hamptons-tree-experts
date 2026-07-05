"use client";

const DIAMETER_TIERS = [
  { value: "under_12in", label: "Under 12″" },
  { value: "12_18in", label: "12–18″" },
  { value: "18_24in", label: "18–24″" },
  { value: "over_24in", label: "Over 24″" },
] as const;

interface StumpGrindingConfigProps {
  config: { diameter_tier: string; count: number };
  onChange: (config: { diameter_tier: string; count: number }) => void;
}

export function StumpGrindingConfig({
  config,
  onChange,
}: StumpGrindingConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-warm-gray-700">
          Stump Diameter
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {DIAMETER_TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() => onChange({ ...config, diameter_tier: tier.value })}
              className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                config.diameter_tier === tier.value
                  ? "border-evergreen bg-evergreen/5 text-evergreen"
                  : "border-warm-gray-200 text-warm-gray-600 hover:border-warm-gray-300"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="stump-count"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Number of Stumps
        </label>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ ...config, count: Math.max(1, config.count - 1) })
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-warm-gray-200 text-warm-gray-600 transition-colors hover:border-warm-gray-300"
          >
            −
          </button>
          <input
            id="stump-count"
            type="number"
            min={1}
            max={50}
            value={config.count}
            onChange={(e) =>
              onChange({
                ...config,
                count: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="h-10 w-20 rounded-lg border-2 border-warm-gray-200 text-center font-mono text-lg focus:border-evergreen focus:outline-none"
          />
          <button
            type="button"
            onClick={() =>
              onChange({ ...config, count: Math.min(50, config.count + 1) })
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-warm-gray-200 text-warm-gray-600 transition-colors hover:border-warm-gray-300"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
