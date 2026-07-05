/**
 * Fictional PII test data (spec §9.5).
 * All names, addresses, and contact info are fabricated.
 */

export const TEST_CUSTOMER = {
  name: "Jane Testerson",
  email: "jane.testerson@example.com",
  phone: "6315551234",
  address: "42 Elm Street, Southampton, NY 11968",
};

export const TEST_CUSTOMER_B = {
  name: "Bob Mockwell",
  email: "bob.mockwell@example.com",
  phone: "6315555678",
  address: "88 Oak Lane, East Hampton, NY 11937",
};

export const STRIPE_TEST_CARDS = {
  success: "4242424242424242",
  decline: "4000000000000002",
  insufficient: "4000000000009995",
};

export const API_BASE = process.env.API_URL ?? "http://localhost:8000";
