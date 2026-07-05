const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ApiError {
  error: { code: string; message: string; details: Record<string, unknown> };
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: ApiError | null; status: number }> {
  const token = getToken();
  if (!token) {
    return {
      data: null,
      error: {
        error: {
          code: "UNAUTHENTICATED",
          message: "Not logged in",
          details: {},
        },
      },
      status: 401,
    };
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Request failed", details: {} },
    }));
    return { data: null, error: body as ApiError, status: res.status };
  }

  const data = (await res.json()) as T;
  return { data, error: null, status: res.status };
}

// --- Dashboard ---

export interface SlotView {
  day: string;
  slot: string;
  hold_type: string;
  order_id: string | null;
  order_number: string | null;
  customer_name: string | null;
  service_name: string | null;
  status: string | null;
}

export interface DayView {
  day: string;
  am_blocked: boolean;
  pm_blocked: boolean;
  slots: SlotView[];
}

export interface NeedsReslotOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  amount_cents: number;
  created_at: string;
}

export interface DashboardResponse {
  days: DayView[];
  needs_reslot: NeedsReslotOrder[];
  total_confirmed: number;
  total_tentative: number;
}

export async function fetchDashboard(range: "today" | "tomorrow" | "week" = "week") {
  return adminFetch<DashboardResponse>(`/api/v1/admin/dashboard?range=${range}`);
}

// --- Order Search ---

export interface OrderSearchResult {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
  service_name: string;
  amount_cents: number;
  created_at: string;
}

export async function searchOrders(q: string) {
  return adminFetch<OrderSearchResult[]>(
    `/api/v1/admin/orders/search?q=${encodeURIComponent(q)}`,
  );
}

// --- Order Actions (Option B — three only) ---

export interface ActionResponse {
  status: string;
  order_id: string;
  order_number: string;
  message?: string;
}

export async function executeOrderAction(
  orderId: string,
  action: "capture" | "cancel" | "extend",
) {
  return adminFetch<ActionResponse>(`/api/v1/admin/orders/${orderId}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

// --- Reschedule ---

export interface RescheduleResponse {
  status: string;
  order_id: string;
  order_number: string;
  new_day: string;
  new_slot: string;
}

export async function rescheduleOrder(
  orderId: string,
  newDate: string,
  newSlot: "am" | "pm",
) {
  return adminFetch<RescheduleResponse>(
    `/api/v1/admin/orders/${orderId}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify({ new_date: newDate, new_slot: newSlot }),
    },
  );
}

// --- Weather Block ---

export async function toggleWeatherBlock(
  day: string,
  amBlocked?: boolean,
  pmBlocked?: boolean,
) {
  return adminFetch<{ day: string; am_blocked: boolean; pm_blocked: boolean }>(
    `/api/v1/admin/capacity/${day}`,
    {
      method: "PUT",
      body: JSON.stringify({
        am_blocked: amBlocked,
        pm_blocked: pmBlocked,
      }),
    },
  );
}

// --- Photo URL ---

export function estimatePhotoUrl(estimateId: string, photoIndex: number): string {
  const token = getToken();
  return `${API_URL}/api/v1/admin/estimates/${estimateId}/photos/${photoIndex}?token=${token}`;
}
