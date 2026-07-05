"use client";

interface PolicyDisclosureProps {
  acknowledged: boolean;
  onAcknowledge: (acknowledged: boolean) => void;
}

export function PolicyDisclosure({
  acknowledged,
  onAcknowledge,
}: PolicyDisclosureProps) {
  return (
    <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-warm-gray-300 text-evergreen focus:ring-evergreen"
        />
        <span className="text-sm leading-relaxed text-warm-gray-600">
          I understand that this is a confirmed booking. Once the crew is
          dispatched, this service is non-refundable. Rescheduling is available
          at no additional charge if requested before the crew departs.
        </span>
      </label>
    </div>
  );
}
