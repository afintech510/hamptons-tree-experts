"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchDashboard,
  searchOrders,
  type DashboardResponse,
  type OrderSearchResult,
} from "@/lib/admin-api";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-warm-gray-100 text-warm-gray-600",
  authorized: "bg-amber-100 text-amber-800",
  captured: "bg-evergreen/10 text-evergreen-dark",
  confirmed_scheduled: "bg-blue-100 text-blue-800",
  needs_reslot: "bg-red-100 text-red-800",
  cancelled: "bg-warm-gray-100 text-warm-gray-500",
  completed: "bg-evergreen/20 text-evergreen-dark",
  rescheduled: "bg-purple-100 text-purple-800",
  refunded: "bg-warm-gray-100 text-warm-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || "bg-warm-gray-100 text-warm-gray-600"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [range, setRange] = useState<"today" | "tomorrow" | "week">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OrderSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await fetchDashboard(range);
    if (apiError) {
      setError(apiError.error.message);
    } else {
      setDashboard(data);
      setError(null);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data, error: apiError } = await searchOrders(searchQuery.trim());
    if (apiError) {
      setError(apiError.error.message);
    } else {
      setSearchResults(data);
    }
    setSearching(false);
  };

  if (error && !dashboard) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-warm-gray-800">
          Admin Dashboard
        </h1>
        <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-4 text-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-warm-gray-800">
          Dashboard
        </h1>
        <div className="flex gap-2">
          {(["today", "tomorrow", "week"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                range === r
                  ? "bg-evergreen text-white"
                  : "bg-white text-warm-gray-600 hover:bg-warm-gray-100"
              }`}
            >
              {r === "today"
                ? "Today"
                : r === "tomorrow"
                  ? "Tomorrow"
                  : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-warm-gray-200 bg-white p-4">
            <p className="text-sm text-warm-gray-500">Confirmed</p>
            <p className="text-2xl font-bold text-evergreen-dark">
              {dashboard.total_confirmed}
            </p>
          </div>
          <div className="rounded-lg border border-warm-gray-200 bg-white p-4">
            <p className="text-sm text-warm-gray-500">Tentative</p>
            <p className="text-2xl font-bold text-amber-700">
              {dashboard.total_tentative}
            </p>
          </div>
          <div className="rounded-lg border border-warm-gray-200 bg-white p-4">
            <p className="text-sm text-warm-gray-500">Needs Reslot</p>
            <p className="text-2xl font-bold text-error">
              {dashboard.needs_reslot.length}
            </p>
          </div>
          <div className="rounded-lg border border-warm-gray-200 bg-white p-4">
            <p className="text-sm text-warm-gray-500">Days Shown</p>
            <p className="text-2xl font-bold text-warm-gray-800">
              {dashboard.days.length}
            </p>
          </div>
        </div>
      )}

      {/* Schedule grid */}
      {dashboard && (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
            Schedule
          </h2>
          {loading ? (
            <p className="text-warm-gray-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-warm-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-gray-200 bg-warm-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">
                      AM
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">
                      PM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.days.map((day) => {
                    const amSlot = day.slots.find((s) => s.slot === "am");
                    const pmSlot = day.slots.find((s) => s.slot === "pm");
                    return (
                      <tr
                        key={day.day}
                        className="border-b border-warm-gray-100"
                      >
                        <td className="px-4 py-3 font-medium text-warm-gray-800">
                          {new Date(day.day + "T12:00:00").toLocaleDateString(
                            "en-US",
                            { weekday: "short", month: "short", day: "numeric" },
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <SlotCell
                            slot={amSlot}
                            blocked={day.am_blocked}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <SlotCell
                            slot={pmSlot}
                            blocked={day.pm_blocked}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Needs reslot */}
      {dashboard && dashboard.needs_reslot.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-error">
            Needs Reslot ({dashboard.needs_reslot.length})
          </h2>
          <div className="space-y-2">
            {dashboard.needs_reslot.map((order) => (
              <a
                key={order.order_id}
                href={`/admin/orders/${order.order_id}`}
                className="block rounded-lg border border-error/20 bg-white p-4 hover:border-error/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-warm-gray-800">
                      {order.order_number}
                    </span>
                    <span className="ml-2 text-warm-gray-500">
                      {order.customer_name}
                    </span>
                    <span className="ml-2 text-warm-gray-400">
                      {order.service_name}
                    </span>
                  </div>
                  <span className="font-medium text-warm-gray-800">
                    {formatCents(order.amount_cents)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
          Order Search
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name, phone, or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-10 flex-1 rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || searchQuery.trim().length < 2}
            className="rounded-lg bg-evergreen px-4 py-2 text-sm font-medium text-white hover:bg-evergreen-dark disabled:opacity-50"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>
        {searchResults && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-warm-gray-200 bg-white">
            {searchResults.length === 0 ? (
              <p className="p-4 text-sm text-warm-gray-400">No results found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-gray-200 bg-warm-gray-50">
                    <th className="px-4 py-2 text-left font-medium text-warm-gray-600">
                      Order
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-warm-gray-600">
                      Customer
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-warm-gray-600">
                      Service
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-warm-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-warm-gray-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((r) => (
                    <tr
                      key={r.order_id}
                      className="border-b border-warm-gray-100 hover:bg-warm-gray-50"
                    >
                      <td className="px-4 py-2">
                        <a
                          href={`/admin/orders/${r.order_id}`}
                          className="font-medium text-evergreen hover:underline"
                        >
                          {r.order_number}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-warm-gray-700">
                        {r.customer_name}
                      </td>
                      <td className="px-4 py-2 text-warm-gray-500">
                        {r.service_name}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-warm-gray-800">
                        {formatCents(r.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotCell({
  slot,
  blocked,
}: {
  slot:
    | {
        hold_type: string;
        order_id: string | null;
        order_number: string | null;
        customer_name: string | null;
        service_name: string | null;
        status: string | null;
      }
    | undefined;
  blocked: boolean;
}) {
  if (blocked) {
    return (
      <span className="text-xs font-medium text-warm-gray-400">
        Weather blocked
      </span>
    );
  }
  if (!slot) {
    return (
      <span className="text-xs text-warm-gray-300">Open</span>
    );
  }
  return (
    <a
      href={slot.order_id ? `/admin/orders/${slot.order_id}` : undefined}
      className="group block"
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            slot.hold_type === "confirmed" ? "bg-evergreen" : "bg-amber-400"
          }`}
        />
        <span className="text-xs font-medium text-warm-gray-700 group-hover:text-evergreen">
          {slot.order_number}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-warm-gray-400">
        {slot.customer_name} — {slot.service_name}
      </p>
      {slot.status && <StatusBadge status={slot.status} />}
    </a>
  );
}
