"use client";

import { useState } from "react";
import { executeOrderAction, rescheduleOrder } from "@/lib/admin-api";

type ActionType = "capture" | "cancel" | "extend";

const ACTION_CONFIG: Record<
  ActionType,
  {
    label: string;
    confirmLabel: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  capture: {
    label: "Capture Payment",
    confirmLabel: "Confirm Capture",
    description:
      "Charge the customer's card for the held amount. Only capture once the job is complete or stock is confirmed.",
    color: "text-evergreen-dark",
    bgColor: "bg-evergreen/10",
    borderColor: "border-evergreen/30",
  },
  cancel: {
    label: "Cancel Order",
    confirmLabel: "Confirm Cancellation",
    description:
      "Release the authorization hold and free up the time slot. This cannot be undone.",
    color: "text-error",
    bgColor: "bg-error/5",
    borderColor: "border-error/30",
  },
  extend: {
    label: "Extend Hold",
    confirmLabel: "Send Re-auth Link",
    description:
      "Email the customer a link to re-authorize payment. Use when the original hold is approaching expiry and the job hasn't been completed yet.",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
};

const ALLOWED_ACTIONS: Record<string, ActionType[]> = {
  authorized: ["capture", "cancel", "extend"],
  confirmed_scheduled: ["capture", "cancel"],
  needs_reslot: ["cancel"],
};

interface HoldActionPanelProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  amountCents: number;
  onActionComplete: () => void;
}

export function HoldActionPanel({
  orderId,
  orderNumber,
  orderStatus,
  amountCents,
  onActionComplete,
}: HoldActionPanelProps) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const allowedActions = ALLOWED_ACTIONS[orderStatus] || [];

  if (allowedActions.length === 0) {
    return null;
  }

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleAction = async (action: ActionType) => {
    setLoading(true);
    setPendingAction(null);

    const { error } = await executeOrderAction(orderId, action);

    if (error) {
      showToast("error", error.error.message);
    } else {
      const successMessages: Record<ActionType, string> = {
        capture: `Payment captured for ${orderNumber}`,
        cancel: `Order ${orderNumber} cancelled — hold released`,
        extend: `Re-authorization link sent for ${orderNumber}`,
      };
      showToast("success", successMessages[action]);
      onActionComplete();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-warm-gray-800">
        Actions
      </h3>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            toast.type === "success"
              ? "border-evergreen/30 bg-evergreen/5 text-evergreen-dark"
              : "border-error/30 bg-error/5 text-error"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirmation overlay */}
      {pendingAction && (
        <div
          className={`rounded-lg border p-4 ${ACTION_CONFIG[pendingAction].bgColor} ${ACTION_CONFIG[pendingAction].borderColor}`}
        >
          <p
            className={`text-sm font-medium ${ACTION_CONFIG[pendingAction].color}`}
          >
            {ACTION_CONFIG[pendingAction].description}
          </p>
          {pendingAction === "capture" && (
            <p className="mt-2 text-sm font-semibold text-warm-gray-800">
              Amount: ${(amountCents / 100).toFixed(2)}
            </p>
          )}
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => handleAction(pendingAction)}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                pendingAction === "cancel"
                  ? "bg-error hover:bg-error/90"
                  : pendingAction === "capture"
                    ? "bg-evergreen hover:bg-evergreen-dark"
                    : "bg-amber-600 hover:bg-amber-700"
              } disabled:opacity-50`}
            >
              {loading
                ? "Processing..."
                : ACTION_CONFIG[pendingAction].confirmLabel}
            </button>
            <button
              onClick={() => setPendingAction(null)}
              disabled={loading}
              className="rounded-lg border border-warm-gray-200 bg-white px-4 py-2 text-sm text-warm-gray-600 hover:bg-warm-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!pendingAction && (
        <div className="flex flex-wrap gap-3">
          {allowedActions.map((action) => {
            const cfg = ACTION_CONFIG[action];
            return (
              <button
                key={action}
                onClick={() => setPendingAction(action)}
                disabled={loading}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${cfg.borderColor} ${cfg.bgColor} ${cfg.color} hover:opacity-80 disabled:opacity-50`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Reschedule Panel ---

interface ReschedulePanelProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  onRescheduleComplete: () => void;
}

const RESCHEDULE_ALLOWED = new Set([
  "authorized",
  "confirmed_scheduled",
  "needs_reslot",
  "rescheduled",
]);

export function ReschedulePanel({
  orderId,
  orderNumber,
  orderStatus,
  onRescheduleComplete,
}: ReschedulePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState<"am" | "pm">("am");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!RESCHEDULE_ALLOWED.has(orderStatus)) return null;

  const handleReschedule = async () => {
    if (!newDate) return;
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await rescheduleOrder(
      orderId,
      newDate,
      newSlot,
    );

    if (apiError) {
      setError(apiError.error.message);
    } else if (data) {
      setSuccess(
        `${orderNumber} rescheduled to ${data.new_day} ${data.new_slot === "am" ? "Morning" : "Afternoon"}`,
      );
      setShowForm(false);
      setTimeout(() => setSuccess(null), 5000);
      onRescheduleComplete();
    }
    setLoading(false);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-bold text-warm-gray-800">
        Reschedule
      </h3>

      {success && (
        <div className="rounded-lg border border-evergreen/30 bg-evergreen/5 p-3 text-sm text-evergreen-dark">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-warm-gray-200 bg-white px-4 py-2 text-sm font-medium text-warm-gray-700 hover:bg-warm-gray-50"
        >
          Reschedule This Order
        </button>
      ) : (
        <div className="rounded-lg border border-warm-gray-200 bg-white p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-warm-gray-700">
                New Date
              </label>
              <input
                type="date"
                min={minDateStr}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-gray-700">
                Slot
              </label>
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value as "am" | "pm")}
                className="mt-1 h-10 rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
              >
                <option value="am">Morning</option>
                <option value="pm">Afternoon</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleReschedule}
              disabled={loading || !newDate}
              className="rounded-lg bg-evergreen px-4 py-2 text-sm font-medium text-white hover:bg-evergreen-dark disabled:opacity-50"
            >
              {loading ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-lg border border-warm-gray-200 px-4 py-2 text-sm text-warm-gray-600 hover:bg-warm-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
