/**
 * API helper functions for E2E test setup and teardown.
 *
 * These call the FastAPI backend directly (not through the browser)
 * to seed data, create orders, and verify state for E2E scenarios.
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE } from "./test-data";

export async function seedCapacityDay(
  request: APIRequestContext,
  day: string,
  opts?: { amBlocked?: boolean; pmBlocked?: boolean }
) {
  // Capacity days are lazily materialized, but for weather-block tests
  // we need to pre-seed via the admin API
  const adminToken = process.env.TEST_ADMIN_TOKEN ?? "";
  const resp = await request.put(`${API_BASE}/api/v1/admin/capacity/${day}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      am_blocked: opts?.amBlocked ?? false,
      pm_blocked: opts?.pmBlocked ?? false,
    },
  });
  return resp;
}

export async function getOrderByNumber(
  request: APIRequestContext,
  orderNumber: string,
  email: string
) {
  const resp = await request.get(`${API_BASE}/api/v1/orders/lookup`, {
    params: { order_number: orderNumber, email },
  });
  return resp;
}

export async function adminAction(
  request: APIRequestContext,
  orderId: string,
  action: "capture" | "cancel" | "extend"
) {
  const adminToken = process.env.TEST_ADMIN_TOKEN ?? "";
  const resp = await request.post(
    `${API_BASE}/api/v1/admin/orders/${orderId}/action`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { action },
    }
  );
  return resp;
}

export async function adminReschedule(
  request: APIRequestContext,
  orderId: string,
  newDate: string,
  newSlot: "am" | "pm"
) {
  const adminToken = process.env.TEST_ADMIN_TOKEN ?? "";
  const resp = await request.post(
    `${API_BASE}/api/v1/admin/orders/${orderId}/reschedule`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { new_date: newDate, new_slot: newSlot },
    }
  );
  return resp;
}

export function generateIdempotencyKey(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
