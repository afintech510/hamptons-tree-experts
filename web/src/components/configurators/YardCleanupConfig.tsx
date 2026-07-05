"use client";

const MAX_DEBRIS_CU_YD = 5;
const MAX_PROPERTY_ACRES = 1;

interface YardCleanupConfigProps {
  config: { combined_debris_cu_yd: number; property_acres: number };
  onChange: (config: {
    combined_debris_cu_yd: number;
    property_acres: number;
  }) => void;
  boundsExceeded: boolean;
}

export function YardCleanupConfig({
  config,
  onChange,
  boundsExceeded,
}: YardCleanupConfigProps) {
  const debrisOver = config.combined_debris_cu_yd > MAX_DEBRIS_CU_YD;
  const acresOver = config.property_acres > MAX_PROPERTY_ACRES;

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="debris-qty"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Combined Debris (Cubic Yards)
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          Total brush, grass clippings, and fill to be removed (max{" "}
          {MAX_DEBRIS_CU_YD} cu yd)
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="debris-qty"
            type="number"
            min={1}
            max={20}
            step={0.5}
            value={config.combined_debris_cu_yd}
            onChange={(e) =>
              onChange({
                ...config,
                combined_debris_cu_yd: Math.max(
                  0.5,
                  parseFloat(e.target.value) || 0.5,
                ),
              })
            }
            className={`h-10 w-24 rounded-lg border-2 text-center font-mono text-lg focus:outline-none ${
              debrisOver
                ? "border-error text-error"
                : "border-warm-gray-200 focus:border-evergreen"
            }`}
          />
          <span className="text-sm text-warm-gray-500">cu yd</span>
        </div>
        {debrisOver && (
          <p className="mt-2 text-sm text-error">
            Exceeds the {MAX_DEBRIS_CU_YD} cu yd instant-quote limit
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="acres-qty"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Property Size (Acres)
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          Approximate lot size (max {MAX_PROPERTY_ACRES} acre for instant
          pricing)
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="acres-qty"
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={config.property_acres}
            onChange={(e) =>
              onChange({
                ...config,
                property_acres: Math.max(
                  0.1,
                  parseFloat(e.target.value) || 0.1,
                ),
              })
            }
            className={`h-10 w-24 rounded-lg border-2 text-center font-mono text-lg focus:outline-none ${
              acresOver
                ? "border-error text-error"
                : "border-warm-gray-200 focus:border-evergreen"
            }`}
          />
          <span className="text-sm text-warm-gray-500">acres</span>
        </div>
        {acresOver && (
          <p className="mt-2 text-sm text-error">
            Exceeds the {MAX_PROPERTY_ACRES}-acre instant-quote limit
          </p>
        )}
      </div>

      {boundsExceeded && (
        <div className="rounded-lg border-2 border-warning bg-warning/5 p-4">
          <p className="font-medium text-warm-gray-800">
            This job is larger than our instant-quote range
          </p>
          <p className="mt-1 text-sm text-warm-gray-600">
            Request an estimate and we&apos;ll price it for your specific
            property.
          </p>
          <a
            href="/contact"
            className="mt-3 inline-flex items-center rounded bg-evergreen px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-evergreen-light"
          >
            Request an Estimate
          </a>
        </div>
      )}
    </div>
  );
}
