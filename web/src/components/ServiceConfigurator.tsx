"use client";

import { StumpGrindingConfig } from "./configurators/StumpGrindingConfig";
import { MulchConfig } from "./configurators/MulchConfig";
import { WeedBlockConfig } from "./configurators/WeedBlockConfig";
import { TopsoilConfig } from "./configurators/TopsoilConfig";
import { YardCleanupConfig } from "./configurators/YardCleanupConfig";
import { TreeRemovalConfig } from "./configurators/TreeRemovalConfig";
import { PlantConfig } from "./configurators/PlantConfig";

export type ServiceConfig = Record<string, unknown>;

interface ServiceConfiguratorProps {
  serviceSlug: string;
  config: ServiceConfig;
  onChange: (config: ServiceConfig) => void;
  boundsExceeded?: boolean;
  photos?: File[];
  onPhotosChange?: (photos: File[]) => void;
  acknowledged?: boolean;
  onAcknowledgeChange?: (v: boolean) => void;
  rangeLow?: number | null;
  rangeHigh?: number | null;
  plantCatalog?: Record<
    string,
    { name: string; sizes: Record<string, number> }
  > | null;
}

export function getDefaultConfig(slug: string): ServiceConfig {
  switch (slug) {
    case "stump-grinding":
      return { diameter_tier: "under_12in", count: 1 };
    case "mulching":
      return { quantity: 1 };
    case "weed-block":
      return { quantity: 100 };
    case "topsoil-reseeding":
      return { quantity: 200 };
    case "yard-cleanup":
      return { combined_debris_cu_yd: 2, property_acres: 0.5 };
    case "tree-removal":
      return {
        approx_height_stories: "1",
        access_difficulty: "easy",
        distance_to_structure_ft: 20,
        access_notes: "",
      };
    case "plants":
      return {
        items: [{ plant_type: "native_shrub", size: "medium", quantity: 1 }],
      };
    default:
      return {};
  }
}

export function ServiceConfigurator({
  serviceSlug,
  config,
  onChange,
  boundsExceeded = false,
  photos = [],
  onPhotosChange,
  acknowledged = false,
  onAcknowledgeChange,
  rangeLow = null,
  rangeHigh = null,
  plantCatalog = null,
}: ServiceConfiguratorProps) {
  switch (serviceSlug) {
    case "stump-grinding":
      return (
        <StumpGrindingConfig
          config={config as { diameter_tier: string; count: number }}
          onChange={onChange}
        />
      );
    case "mulching":
      return (
        <MulchConfig
          config={config as { quantity: number }}
          onChange={onChange}
        />
      );
    case "weed-block":
      return (
        <WeedBlockConfig
          config={config as { quantity: number }}
          onChange={onChange}
        />
      );
    case "topsoil-reseeding":
      return (
        <TopsoilConfig
          config={config as { quantity: number }}
          onChange={onChange}
        />
      );
    case "yard-cleanup":
      return (
        <YardCleanupConfig
          config={
            config as {
              combined_debris_cu_yd: number;
              property_acres: number;
            }
          }
          onChange={onChange}
          boundsExceeded={boundsExceeded}
        />
      );
    case "tree-removal":
      return (
        <TreeRemovalConfig
          config={
            config as {
              approx_height_stories: string;
              access_difficulty: string;
              distance_to_structure_ft: number;
              access_notes: string;
            }
          }
          onChange={onChange}
          photos={photos}
          onPhotosChange={onPhotosChange || (() => {})}
          acknowledged={acknowledged}
          onAcknowledgeChange={onAcknowledgeChange || (() => {})}
          rangeLow={rangeLow}
          rangeHigh={rangeHigh}
        />
      );
    case "plants":
      return (
        <PlantConfig
          config={config as { items: { plant_type: string; size: string; quantity: number }[] }}
          onChange={onChange}
          catalog={plantCatalog}
        />
      );
    default:
      return (
        <p className="text-warm-gray-500">
          No configurator available for this service.
        </p>
      );
  }
}
