"use client";

interface MulchConfigProps {
  config: { quantity: number };
  onChange: (config: { quantity: number }) => void;
}

export function MulchConfig({ config, onChange }: MulchConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="mulch-qty"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Cubic Yards of Mulch
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          1 cubic yard covers roughly 100 sq ft at 3″ depth
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ quantity: Math.max(1, config.quantity - 1) })
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-warm-gray-200 text-warm-gray-600 transition-colors hover:border-warm-gray-300"
          >
            −
          </button>
          <input
            id="mulch-qty"
            type="number"
            min={1}
            max={50}
            value={config.quantity}
            onChange={(e) =>
              onChange({
                quantity: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="h-10 w-20 rounded-lg border-2 border-warm-gray-200 text-center font-mono text-lg focus:border-evergreen focus:outline-none"
          />
          <button
            type="button"
            onClick={() =>
              onChange({ quantity: Math.min(50, config.quantity + 1) })
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-warm-gray-200 text-warm-gray-600 transition-colors hover:border-warm-gray-300"
          >
            +
          </button>
          <span className="text-sm text-warm-gray-500">cu yd</span>
        </div>
      </div>
    </div>
  );
}
