"use client";

import { useRef } from "react";

interface TreeRemovalConfigProps {
  config: {
    approx_height_stories: string;
    access_difficulty: string;
    distance_to_structure_ft: number;
    access_notes: string;
  };
  onChange: (config: TreeRemovalConfigProps["config"]) => void;
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  acknowledged: boolean;
  onAcknowledgeChange: (v: boolean) => void;
  rangeLow: number | null;
  rangeHigh: number | null;
}

const HEIGHT_OPTIONS = [
  { value: "1", label: "1 story (~10–15 ft)" },
  { value: "2", label: "2 stories (~20–30 ft)" },
  { value: "3", label: "3 stories (~30–45 ft)" },
  { value: "4_plus", label: "4+ stories (45+ ft)" },
];

const ACCESS_OPTIONS = [
  { value: "easy", label: "Easy", desc: "Open access, no obstacles" },
  {
    value: "moderate",
    label: "Moderate",
    desc: "Some obstacles or tight spaces",
  },
  {
    value: "difficult",
    label: "Difficult",
    desc: "Very tight access, near structures or power lines",
  },
];

const MAX_PHOTOS = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TreeRemovalConfig({
  config,
  onChange,
  photos,
  onPhotosChange,
  acknowledged,
  onAcknowledgeChange,
  rangeLow,
  rangeHigh,
}: TreeRemovalConfigProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = [...photos, ...files].slice(0, MAX_PHOTOS);
    onPhotosChange(newPhotos);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-warm-gray-700">
          Approximate Tree Height
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {HEIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange({ ...config, approx_height_stories: opt.value })
              }
              className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                config.approx_height_stories === opt.value
                  ? "border-evergreen bg-evergreen/5 font-medium text-evergreen-dark"
                  : "border-warm-gray-200 text-warm-gray-600 hover:border-warm-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Access difficulty */}
      <div>
        <label className="block text-sm font-medium text-warm-gray-700">
          Access Difficulty
        </label>
        <div className="mt-2 space-y-2">
          {ACCESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange({ ...config, access_difficulty: opt.value })
              }
              className={`w-full rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                config.access_difficulty === opt.value
                  ? "border-evergreen bg-evergreen/5"
                  : "border-warm-gray-200 hover:border-warm-gray-300"
              }`}
            >
              <span
                className={`text-sm font-medium ${config.access_difficulty === opt.value ? "text-evergreen-dark" : "text-warm-gray-700"}`}
              >
                {opt.label}
              </span>
              <span className="ml-2 text-sm text-warm-gray-400">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Distance to structure */}
      <div>
        <label
          htmlFor="distance-ft"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Distance to Nearest Structure (feet)
        </label>
        <input
          id="distance-ft"
          type="number"
          min={0}
          max={500}
          value={config.distance_to_structure_ft}
          onChange={(e) =>
            onChange({
              ...config,
              distance_to_structure_ft: Math.max(
                0,
                parseInt(e.target.value) || 0,
              ),
            })
          }
          className="mt-1 h-10 w-32 rounded-lg border-2 border-warm-gray-200 px-3 text-center font-mono focus:border-evergreen focus:outline-none"
        />
        <p className="mt-1 text-sm text-warm-gray-400">
          Approximate distance from the tree to the nearest building, fence, or
          power line
        </p>
      </div>

      {/* Access notes */}
      <div>
        <label
          htmlFor="access-notes"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Additional Access Notes (optional)
        </label>
        <textarea
          id="access-notes"
          rows={3}
          value={config.access_notes}
          onChange={(e) =>
            onChange({ ...config, access_notes: e.target.value })
          }
          placeholder="e.g., gate code needed, narrow driveway, tree leans toward pool house..."
          className="mt-1 w-full rounded-lg border-2 border-warm-gray-200 p-3 text-sm focus:border-evergreen focus:outline-none"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-medium text-warm-gray-700">
          Photos of the Tree ({photos.length}/{MAX_PHOTOS})
        </label>
        <p className="mt-1 text-sm text-warm-gray-400">
          Upload clear photos showing the full tree, its base, and surrounding
          area. JPEG, PNG, or WebP up to 10MB each.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {photos.map((file, i) => (
            <div
              key={i}
              className="relative h-20 w-20 rounded-lg border-2 border-warm-gray-200 bg-warm-gray-50"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${i + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => handlePhotoRemove(i)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs text-white"
              >
                x
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-warm-gray-300 text-warm-gray-400 transition-colors hover:border-evergreen hover:text-evergreen"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoAdd}
          className="hidden"
        />
      </div>

      {/* Price range display */}
      {rangeLow !== null && rangeHigh !== null && (
        <div className="rounded-lg border-2 border-sand bg-sand/10 p-4">
          <p className="text-sm font-medium text-warm-gray-700">
            Estimated Range
          </p>
          <p className="mt-1 text-2xl font-bold text-evergreen-dark">
            {formatCents(rangeLow)} – {formatCents(rangeHigh)}
          </p>
          <p className="mt-2 text-xs text-warm-gray-400">
            An authorization hold of {formatCents(rangeHigh)} will be placed on
            your card. The final price will be confirmed after our crew assesses
            the site. You will not be charged more than the high end of this
            range.
          </p>
        </div>
      )}

      {/* Acknowledgment */}
      <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-warm-gray-300 text-evergreen focus:ring-evergreen"
          />
          <span className="text-sm leading-relaxed text-warm-gray-600">
            I understand this is a <strong>non-binding estimate</strong>, not a
            safety or hazard assessment. If I have an actively hazardous tree
            (leaning, split, or storm-damaged), I should call us directly for
            emergency service.
          </span>
        </label>
      </div>
    </div>
  );
}
