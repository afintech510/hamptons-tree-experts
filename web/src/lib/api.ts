const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface TierPrice {
  total_cents: number;
  available: boolean;
}

export interface QuoteResponse {
  base_cents: number;
  tier_prices: Record<string, TierPrice>;
  bounds_ok: boolean;
  bounds_reason: string | null;
  range_low_cents?: number;
  range_high_cents?: number;
}

export interface ServiceOut {
  id: string;
  slug: string;
  name: string;
  fulfillment_type: string;
  pricing_model: Record<string, unknown>;
  active: boolean;
}

export interface BinCheckoutRequest {
  service_slug: string;
  config: Record<string, unknown>;
  urgency_tier: string;
  requested_date: string;
  slot: "am" | "pm";
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  service_address: string;
  payment_method_id: string;
  policy_acknowledged: boolean;
}

export interface BinCheckoutResponse {
  order_number: string;
  status: string;
  amount_cents: number;
  slot_day: string;
  slot_time: string;
  customer_email: string;
}

export interface OrderLookupResponse {
  order_number: string;
  status: string;
  amount_cents: number;
  service_name: string;
  urgency_tier: string;
  slot_day: string | null;
  slot_time: string | null;
  service_address: string;
  created_at: string | null;
}

export interface ApiError {
  error: { code: string; message: string; details: Record<string, unknown> };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: ApiError | null; status: number }> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

export async function fetchServices() {
  return apiFetch<ServiceOut[]>("/api/v1/services");
}

export async function fetchQuote(
  serviceSlug: string,
  config: Record<string, unknown>,
  requestedDate?: string,
) {
  return apiFetch<QuoteResponse>("/api/v1/pricing/quote", {
    method: "POST",
    body: JSON.stringify({
      service_slug: serviceSlug,
      config,
      requested_date: requestedDate,
    }),
  });
}

export async function submitBinOrder(
  body: BinCheckoutRequest,
  idempotencyKey: string,
) {
  return apiFetch<BinCheckoutResponse>("/api/v1/orders/bin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

export async function lookupOrder(orderNumber: string, email: string) {
  const params = new URLSearchParams({ order_number: orderNumber, email });
  return apiFetch<OrderLookupResponse>(
    `/api/v1/orders/lookup?${params.toString()}`,
  );
}

// --- Estimate submission (tree removal) ---

export interface EstimateResponse {
  order_number: string;
  status: string;
  amount_cents: number;
  range_low_cents: number;
  range_high_cents: number;
  valid_until: string;
  slot_day: string;
  slot_time: string;
  customer_email: string;
  message: string;
}

export async function submitEstimate(
  formData: FormData,
  idempotencyKey: string,
): Promise<{ data: EstimateResponse | null; error: ApiError | null; status: number }> {
  const res = await fetch(`${API_URL}/api/v1/estimates`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Request failed", details: {} },
    }));
    return { data: null, error: body as ApiError, status: res.status };
  }

  const data = (await res.json()) as EstimateResponse;
  return { data, error: null, status: res.status };
}

// --- Authorize-confirm (plants) ---

export interface AuthorizeConfirmRequest {
  service_slug: string;
  config: Record<string, unknown>;
  urgency_tier: string;
  requested_date: string;
  slot: "am" | "pm";
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  service_address: string;
  payment_method_id: string;
  policy_acknowledged: boolean;
}

export interface AuthorizeConfirmResponse {
  order_number: string;
  status: string;
  amount_cents: number;
  slot_day: string;
  slot_time: string;
  customer_email: string;
  message: string;
}

export async function submitAuthorizeConfirm(
  body: AuthorizeConfirmRequest,
  idempotencyKey: string,
) {
  return apiFetch<AuthorizeConfirmResponse>("/api/v1/orders/authorize-confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

// --- Reauthorize (extend flow) ---

export interface ReauthorizeRequest {
  order_id: string;
  token: string;
  payment_method_id: string;
}

export interface ReauthorizeResponse {
  status: string;
  order_number: string;
  message: string;
}

export async function submitReauthorize(body: ReauthorizeRequest) {
  return apiFetch<ReauthorizeResponse>("/api/v1/orders/reauthorize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
