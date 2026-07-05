"use client";

interface TopsoilConfigProps {
  config: { quantity: number };
  onChange: (config: { quantity: number }) => void;
}

export function TopsoilConfig({ config, onChange }: TopsoilConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="topsoil-qty"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Area to Restore (Square Feet)
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          Includes screened topsoil, grading, and region-appropriate seed blend
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="topsoil-qty"
            type="number"
            min={50}
            max={10000}
            step={25}
            value={config.quantity}
            onChange={(e) =>
              onChange({
                quantity: Math.max(50, parseInt(e.target.value) || 50),
              })
            }
            className="h-10 w-28 rounded-lg border-2 border-warm-gray-200 text-center font-mono text-lg focus:border-evergreen focus:outline-none"
          />
          <span className="text-sm text-warm-gray-500">sq ft</span>
        </div>
      </div>
    </div>
  );
}
