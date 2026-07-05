"use client";

interface SlotPickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedSlot: "am" | "pm" | null;
  onSlotChange: (slot: "am" | "pm") => void;
}

function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getMaxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export function SlotPicker({
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotChange,
}: SlotPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="service-date"
          className="block text-sm font-medium text-warm-gray-700"
        >
          Service Date
        </label>
        <input
          id="service-date"
          type="date"
          min={getMinDate()}
          max={getMaxDate()}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="mt-2 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 font-mono focus:border-evergreen focus:outline-none sm:w-48"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-warm-gray-700">
          Preferred Time
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:w-64">
          {(["am", "pm"] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onSlotChange(slot)}
              className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                selectedSlot === slot
                  ? "border-evergreen bg-evergreen/5 text-evergreen"
                  : "border-warm-gray-200 text-warm-gray-600 hover:border-warm-gray-300"
              }`}
            >
              {slot === "am" ? "Morning (AM)" : "Afternoon (PM)"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
