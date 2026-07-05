"use client";

interface PlantItem {
  plant_type: string;
  size: string;
  quantity: number;
}

interface PlantConfigProps {
  config: { items: PlantItem[] };
  onChange: (config: { items: PlantItem[] }) => void;
  catalog: Record<
    string,
    { name: string; sizes: Record<string, number> }
  > | null;
}

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function PlantConfig({ config, onChange, catalog }: PlantConfigProps) {
  const items = config.items;
  const catalogEntries = catalog ? Object.entries(catalog) : [];

  const updateItem = (index: number, updates: Partial<PlantItem>) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, ...updates } : item,
    );
    onChange({ items: newItems });
  };

  const addItem = () => {
    if (catalogEntries.length === 0) return;
    const [firstKey, firstEntry] = catalogEntries[0];
    const firstSize = Object.keys(firstEntry.sizes)[0] || "small";
    onChange({
      items: [
        ...items,
        { plant_type: firstKey, size: firstSize, quantity: 1 },
      ],
    });
  };

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) });
  };

  if (!catalog || catalogEntries.length === 0) {
    return (
      <p className="text-sm text-warm-gray-400">
        Plant catalog is loading...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        const entry = catalog[item.plant_type];
        const sizes = entry?.sizes || {};

        return (
          <div
            key={i}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-warm-gray-200 bg-white p-4"
          >
            {/* Plant type */}
            <div className="min-w-[160px] flex-1">
              <label className="block text-xs font-medium text-warm-gray-500">
                Plant Type
              </label>
              <select
                value={item.plant_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const newEntry = catalog[newType];
                  const firstSize = newEntry
                    ? Object.keys(newEntry.sizes)[0]
                    : "small";
                  updateItem(i, { plant_type: newType, size: firstSize });
                }}
                className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-2 text-sm focus:border-evergreen focus:outline-none"
              >
                {catalogEntries.map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-warm-gray-500">
                Size
              </label>
              <select
                value={item.size}
                onChange={(e) => updateItem(i, { size: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-2 text-sm focus:border-evergreen focus:outline-none"
              >
                {Object.entries(sizes).map(([sizeKey, price]) => (
                  <option key={sizeKey} value={sizeKey}>
                    {SIZE_LABELS[sizeKey] || sizeKey} ({formatCents(price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="w-20">
              <label className="block text-xs font-medium text-warm-gray-500">
                Qty
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={item.quantity}
                onChange={(e) =>
                  updateItem(i, {
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 text-center text-sm focus:border-evergreen focus:outline-none"
              />
            </div>

            {/* Price */}
            <div className="w-20 text-right">
              <p className="text-xs text-warm-gray-400">Subtotal</p>
              <p className="mt-1 text-sm font-semibold text-warm-gray-800">
                {formatCents((sizes[item.size] || 0) * item.quantity)}
              </p>
            </div>

            {/* Remove */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="mb-1 text-sm text-warm-gray-400 hover:text-error"
              >
                Remove
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addItem}
        className="w-full rounded-lg border-2 border-dashed border-warm-gray-300 py-3 text-sm text-warm-gray-500 transition-colors hover:border-evergreen hover:text-evergreen"
      >
        + Add Another Plant
      </button>
    </div>
  );
}
