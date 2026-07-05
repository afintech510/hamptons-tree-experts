"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { getServiceBySlug } from "@/lib/data/services";
import {
  ServiceConfigurator,
  getDefaultConfig,
} from "@/components/ServiceConfigurator";
import type { ServiceConfig } from "@/components/ServiceConfigurator";
import { UrgencyTierSelector } from "@/components/UrgencyTierSelector";
import { SlotPicker } from "@/components/SlotPicker";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Button } from "@/components/Button";
import { fetchQuote, fetchServices } from "@/lib/api";
import type { QuoteResponse } from "@/lib/api";

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function ConfigurePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceSlug = searchParams.get("service") || "";
  const service = getServiceBySlug(serviceSlug);

  const [config, setConfig] = useState<ServiceConfig>(() =>
    getDefaultConfig(serviceSlug),
  );
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getDefaultDate);
  const [selectedSlot, setSelectedSlot] = useState<"am" | "pm" | null>(null);

  // Tree removal specific state
  const [photos, setPhotos] = useState<File[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  // Plant catalog (loaded from API)
  const [plantCatalog, setPlantCatalog] = useState<Record<
    string,
    { name: string; sizes: Record<string, number> }
  > | null>(null);

  const isEstimate = service?.fulfillmentType === "estimate";
  const isAuthorizeConfirm = service?.fulfillmentType === "authorize_confirm";
  const isBin = service?.fulfillmentType === "bin_immediate";

  // Load plant catalog from services API
  useEffect(() => {
    if (!isAuthorizeConfirm) return;
    fetchServices().then(({ data }) => {
      if (data) {
        const svc = data.find((s) => s.slug === serviceSlug);
        if (svc?.pricing_model?.catalog) {
          setPlantCatalog(
            svc.pricing_model.catalog as Record<
              string,
              { name: string; sizes: Record<string, number> }
            >,
          );
        }
      }
    });
  }, [isAuthorizeConfirm, serviceSlug]);

  const fetchPricing = useCallback(async () => {
    if (!serviceSlug) return;
    setQuoteLoading(true);
    setQuoteError(null);

    const { data, error } = await fetchQuote(
      serviceSlug,
      config,
      selectedDate || undefined,
    );

    if (error) {
      if (error.error.code === "BOUNDS_EXCEEDED") {
        setQuoteData(null);
        setQuoteError(error.error.message);
      } else {
        setQuoteError(error.error.message);
      }
    } else if (data) {
      setQuoteData(data);
      setQuoteError(null);
      if (!isEstimate && !selectedTier) {
        const available = Object.entries(data.tier_prices).find(
          ([, v]) => v.available,
        );
        if (available) setSelectedTier(available[0]);
      }
    }

    setQuoteLoading(false);
  }, [serviceSlug, config, selectedDate, selectedTier, isEstimate]);

  useEffect(() => {
    const timeout = setTimeout(fetchPricing, 300);
    return () => clearTimeout(timeout);
  }, [fetchPricing]);

  if (!service) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Service Not Found</h1>
        <p className="mt-4 text-warm-gray-500">
          We couldn&apos;t find that service.
        </p>
        <Button href="/services/stump-grinding" className="mt-6">
          Browse Services
        </Button>
      </div>
    );
  }

  const boundsExceeded =
    quoteError !== null && serviceSlug === "yard-cleanup";

  // Determine if the user can proceed
  const canProceedBin =
    isBin &&
    quoteData &&
    !boundsExceeded &&
    selectedTier &&
    selectedDate &&
    selectedSlot &&
    quoteData.tier_prices[selectedTier]?.available;

  const canProceedEstimate =
    isEstimate &&
    quoteData &&
    quoteData.range_high_cents &&
    selectedDate &&
    selectedSlot &&
    acknowledged;

  const canProceedAuthorize =
    isAuthorizeConfirm &&
    quoteData &&
    selectedTier &&
    selectedDate &&
    selectedSlot &&
    quoteData.tier_prices[selectedTier]?.available;

  const canProceed = canProceedBin || canProceedEstimate || canProceedAuthorize;

  const handleProceed = () => {
    if (!canProceed) return;

    if (isBin) {
      const params = new URLSearchParams({
        service: serviceSlug,
        config: JSON.stringify(config),
        tier: selectedTier!,
        date: selectedDate,
        slot: selectedSlot!,
      });
      router.push(`/book/checkout?${params.toString()}`);
    } else if (isEstimate) {
      // For estimates, we pass config via sessionStorage (because of photos)
      sessionStorage.setItem(
        "estimate_data",
        JSON.stringify({
          service: serviceSlug,
          config,
          date: selectedDate,
          slot: selectedSlot,
          range_low_cents: quoteData!.range_low_cents,
          range_high_cents: quoteData!.range_high_cents,
        }),
      );
      router.push("/book/estimate-checkout");
    } else if (isAuthorizeConfirm) {
      const params = new URLSearchParams({
        service: serviceSlug,
        config: JSON.stringify(config),
        tier: selectedTier!,
        date: selectedDate,
        slot: selectedSlot!,
      });
      router.push(`/book/authorize-checkout?${params.toString()}`);
    }
  };

  const showTierSelector = !isEstimate && !boundsExceeded;
  const showDateSlot = isEstimate
    ? !!quoteData?.range_high_cents
    : !boundsExceeded && quoteData;

  return (
    <>
      <section className="bg-evergreen-dark px-6 py-12 text-white">
        <div className="mx-auto max-w-[720px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            {isEstimate
              ? "Get an Estimate"
              : isAuthorizeConfirm
                ? "Configure Your Order"
                : "Configure Your Service"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            {service.name}
          </h1>
        </div>
      </section>

      <section className="bg-hte-white px-6 py-12">
        <div className="mx-auto max-w-[720px] space-y-10">
          {/* Service configurator */}
          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-warm-gray-800">
              1. {isEstimate ? "Describe the Tree" : "Configure"}
            </h2>
            <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
              <ServiceConfigurator
                serviceSlug={serviceSlug}
                config={config}
                onChange={setConfig}
                boundsExceeded={boundsExceeded}
                photos={photos}
                onPhotosChange={setPhotos}
                acknowledged={acknowledged}
                onAcknowledgeChange={setAcknowledged}
                rangeLow={quoteData?.range_low_cents ?? null}
                rangeHigh={quoteData?.range_high_cents ?? null}
                plantCatalog={plantCatalog}
              />
            </div>
          </div>

          {/* Pricing / tier selector (not for estimates — R-34) */}
          {showTierSelector && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold text-warm-gray-800">
                2. Choose Urgency
              </h2>
              <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
                {quoteLoading && (
                  <p className="text-sm text-warm-gray-400">
                    Calculating pricing...
                  </p>
                )}
                {quoteData && Object.keys(quoteData.tier_prices).length > 0 && (
                  <UrgencyTierSelector
                    tierPrices={quoteData.tier_prices}
                    selected={selectedTier}
                    onSelect={setSelectedTier}
                  />
                )}
                {quoteError && serviceSlug !== "yard-cleanup" && (
                  <p className="text-sm text-error">{quoteError}</p>
                )}
              </div>
            </div>
          )}

          {/* Date + slot picker */}
          {showDateSlot && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold text-warm-gray-800">
                {isEstimate ? "2" : "3"}. Pick a Date &amp; Time
              </h2>
              <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
                <SlotPicker
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  selectedSlot={selectedSlot}
                  onSlotChange={setSelectedSlot}
                />
              </div>
            </div>
          )}

          {/* Summary + proceed */}
          {canProceed && (
            <div className="rounded-lg border-2 border-evergreen bg-evergreen/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warm-gray-500">
                    {isEstimate ? "Authorization Hold" : "Total"}
                  </p>
                  {isEstimate ? (
                    <p className="text-2xl font-bold text-evergreen-dark">
                      ${((quoteData!.range_high_cents || 0) / 100).toFixed(0)}
                    </p>
                  ) : (
                    <PriceDisplay
                      cents={
                        quoteData!.tier_prices[selectedTier!].total_cents
                      }
                      className="text-3xl font-bold text-evergreen-dark"
                    />
                  )}
                  {isEstimate && (
                    <p className="mt-1 text-xs text-warm-gray-400">
                      Range: $
                      {((quoteData!.range_low_cents || 0) / 100).toFixed(0)} – $
                      {((quoteData!.range_high_cents || 0) / 100).toFixed(0)}
                    </p>
                  )}
                  {isAuthorizeConfirm && (
                    <p className="mt-1 text-xs text-warm-gray-400">
                      Authorization hold — charged only after stock is confirmed
                    </p>
                  )}
                </div>
                <Button onClick={handleProceed} size="lg">
                  {isEstimate
                    ? "Submit Estimate"
                    : isAuthorizeConfirm
                      ? "Authorize & Hold"
                      : "Proceed to Checkout"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-warm-gray-400">Loading...</p>
        </div>
      }
    >
      <ConfigurePageContent />
    </Suspense>
  );
}
