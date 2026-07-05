"use client";

interface WeedBlockConfigProps {
  config: { quantity: number };
  onChange: (config: { quantity: number }) => void;
}

export function WeedBlockConfig({ config, onChange }: WeedBlockConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="weedblock-qty"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Area to Cover (Square Feet)
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          Measure the length × width of the beds or paths you want covered
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="weedblock-qty"
            type="number"
            min={10}
            max={5000}
            step={10}
            value={config.quantity}
            onChange={(e) =>
              onChange({
                quantity: Math.max(10, parseInt(e.target.value) || 10),
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
