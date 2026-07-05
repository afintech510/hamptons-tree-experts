"use client";

import Script from "next/script";

// GA4 Measurement ID — set via env var; analytics is fire-and-forget (F-018)
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID;

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
          ${GADS_ID ? `gtag('config', '${GADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}

export function trackLeadFormSubmit() {
  if (typeof window === "undefined" || !("gtag" in window)) return;

  const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;

  // GA4 event
  gtag("event", "generate_lead", {
    event_category: "lead_form",
    event_label: "contact_form_submit",
  });

  // Google Ads conversion (if configured)
  if (GADS_ID) {
    gtag("event", "conversion", {
      send_to: `${GADS_ID}/lead_form_submit`,
    });
  }
}
