export interface ServiceType {
  slug: string;
  name: string;
  fulfillmentType: "bin_immediate" | "authorize_confirm" | "estimate";
  shortDescription: string;
  description: string;
  features: string[];
  process: string[];
  ctaText: string;
  /** Card thumbnail shown on the home services grid. */
  image: string;
  /** Wide hero band shown on the service detail page. */
  heroImage: string;
}

export const services: ServiceType[] = [
  {
    slug: "mulching",
    name: "Mulching",
    image: "/photos/card-mulching.webp",
    heroImage: "/photos/svc-mulching.webp",
    fulfillmentType: "bin_immediate",
    shortDescription:
      "Professional mulch delivery and installation for beds, borders, and tree rings across the East End.",
    description:
      "Keep your landscape beds healthy, insulated, and polished with professional mulch installation. We source premium hardwood and cedar mulch suited to the sandy, salt-exposed soils common from Westhampton to Riverhead. Proper mulching suppresses weeds, retains moisture through dry Hamptons summers, and protects root systems from the freeze-thaw cycles that stress plants along the South Fork.",
    features: [
      "Premium hardwood, cedar, and dyed mulch options",
      "Proper depth application (2–3 inches) for weed suppression",
      "Bed edging and preparation included",
      "Removal of old, decomposed mulch when needed",
      "Tree ring installation to protect trunk flares",
    ],
    process: [
      "Select your mulch type and estimate the area in cubic yards",
      "Choose your preferred service date and urgency tier",
      "We deliver, spread, and clean up in a single visit",
    ],
    ctaText: "Get Mulching",
  },
  {
    slug: "weed-block",
    name: "Weed Block Fabric",
    image: "/photos/card-weed-block.webp",
    heroImage: "/photos/svc-weed-block.webp",
    fulfillmentType: "bin_immediate",
    shortDescription:
      "Commercial-grade landscape fabric installation to suppress weeds under beds and hardscape.",
    description:
      "End the cycle of constant weeding with professional landscape fabric installation. Our commercial-grade weed barrier is UV-stabilized for the intense East End sun and permeable enough to let water and air reach plant roots. Ideal under mulch beds, stone paths, and gravel driveways—the kind of hardscape common on Hamptons properties where weeds exploit every gap.",
    features: [
      "Commercial-grade UV-stabilized fabric",
      "Proper overlap and pinning to prevent gaps",
      "Cut-outs for existing plantings",
      "Compatible with mulch, stone, and gravel top layers",
      "Extends the life of your mulch by 2–3 seasons",
    ],
    process: [
      "Measure the area in square feet",
      "Choose your preferred service date",
      "We clear, grade, install fabric, and top-dress in one visit",
    ],
    ctaText: "Block Weeds",
  },
  {
    slug: "topsoil-reseeding",
    name: "Topsoil + Reseeding",
    image: "/photos/card-topsoil-reseeding.webp",
    heroImage: "/photos/svc-topsoil-reseeding.webp",
    fulfillmentType: "bin_immediate",
    shortDescription:
      "Lawn restoration with screened topsoil and region-appropriate seed blends for East End properties.",
    description:
      "Restore bare patches, level uneven terrain, and establish thick turf with our topsoil and reseeding service. We use screened loam blended for the sandy, well-draining soils typical of Long Island’s South Fork, paired with seed mixes that thrive in the maritime climate—tall fescue and perennial ryegrass blends that handle salt spray, partial shade from mature oaks, and the summer foot traffic that Hamptons properties see.",
    features: [
      "Screened topsoil graded for proper drainage",
      "Seed blends selected for East End maritime conditions",
      "Starter fertilizer application included",
      "Light raking and rolling for seed-to-soil contact",
      "Seasonal timing advice for best germination",
    ],
    process: [
      "Estimate the area in square feet",
      "Select your preferred date and urgency",
      "We deliver soil, grade, seed, and clean up same-day",
    ],
    ctaText: "Restore Your Lawn",
  },
  {
    slug: "yard-cleanup",
    name: "Bounded Yard Cleanup",
    image: "/photos/card-yard-cleanup.webp",
    heroImage: "/photos/svc-yard-cleanup.webp",
    fulfillmentType: "bin_immediate",
    shortDescription:
      "Full-service debris removal and yard clearing for properties up to 1 acre and 5 cubic yards of waste.",
    description:
      "Clear storm debris, fallen branches, leaf accumulation, and overgrown brush in a single, bounded visit. This service is designed for the typical East End property—up to 1 acre and 5 cubic yards of combined debris—covering everything from post-nor’easter cleanup to seasonal leaf removal. Properties exceeding these bounds are directed to our estimate-based tree removal service for custom scoping.",
    features: [
      "Storm debris and fallen branch removal",
      "Leaf and brush clearing",
      "Haul-away of all collected material",
      "Bounded scope: up to 5 cu yd debris, 1 acre property",
      "Larger jobs directed to custom estimate for accurate pricing",
    ],
    process: [
      "Confirm your property is within the 1-acre / 5 cu yd bounds",
      "Pick your date and urgency tier",
      "Crew clears, loads, and hauls in one visit",
    ],
    ctaText: "Book Cleanup",
  },
  {
    slug: "stump-grinding",
    name: "Stump Grinding",
    image: "/photos/card-stump-grinding.webp",
    heroImage: "/photos/svc-stump-grinding.webp",
    fulfillmentType: "bin_immediate",
    shortDescription:
      "Stump removal by grinding, sized by diameter, with chip cleanup and optional fill.",
    description:
      "Remove unsightly stumps down to 6–8 inches below grade with our professional grinding service. Pricing is tiered by stump diameter—from under 12 inches up to 24+ inches—so you know the cost before we arrive. The resulting wood chips can be left as fill or hauled away. This service is common after storm damage or when clearing overgrown lots, especially on properties with mature oaks, maples, and locusts typical of the East End.",
    features: [
      "Grinding to 6–8 inches below grade",
      "Diameter-tiered pricing: under 12″, 12–18″, 18–24″, over 24″",
      "Surface root grinding included within the stump zone",
      "Chips left as fill or hauled away at your preference",
      "Suitable for multi-stump jobs (priced per stump)",
    ],
    process: [
      "Measure the stump diameter and select the right tier",
      "Choose your service date and urgency",
      "We grind, clean up chips, and leave the area level",
    ],
    ctaText: "Grind It Down",
  },
  {
    slug: "plants",
    name: "Plants",
    image: "/photos/card-plants.webp",
    heroImage: "/photos/svc-plants.webp",
    fulfillmentType: "authorize_confirm",
    shortDescription:
      "Locally sourced plant installation with stock-availability confirmation before your card is charged.",
    description:
      "Add native shrubs, ornamental grasses, perennials, and shade trees to your landscape with our plant installation service. We source from East End nurseries to ensure stock is acclimated to the local maritime climate, sandy soils, and salt exposure. Because plant availability varies seasonally, we place an authorization hold on your card and confirm stock before finalizing the charge—you’re never billed for plants we can’t source.",
    features: [
      "Locally sourced from East End nurseries",
      "Native and salt-tolerant species available",
      "Proper planting depth and soil amendment",
      "Watering instructions and establishment care included",
      "Authorization hold ensures you’re only charged for confirmed stock",
    ],
    process: [
      "Select plant types, sizes, and quantities",
      "We place an authorization hold (not a charge)",
      "Once stock is confirmed, we schedule and install",
    ],
    ctaText: "Order Plants",
  },
  {
    slug: "tree-removal",
    name: "Tree Removal",
    image: "/photos/card-tree-removal.webp",
    heroImage: "/photos/svc-tree-removal.webp",
    fulfillmentType: "estimate",
    shortDescription:
      "Full-service tree removal with on-site assessment, from hazard trees to lot clearing.",
    description:
      "For trees that are dead, dying, storm-damaged, or simply in the way of a renovation, our crew handles the full removal—from felling to stump and debris haul-away. Tree removal is priced by on-site estimate because every job is different: a 40-foot red oak leaning over a Westhampton pool house is a different operation than a cluster of scrub pines on a vacant Speonk lot. You’ll receive a wide price range upfront based on your self-reported details, with the final price confirmed after our crew assesses the site.",
    features: [
      "Full removal: felling, limbing, bucking, and haul-away",
      "Hazard tree assessment and emergency response available",
      "Crane-assisted removal for tight-access properties",
      "Stump grinding available as an add-on",
      "Wide estimate range confirmed with on-site assessment",
    ],
    process: [
      "Submit photos and details about the tree (height, access, proximity to structures)",
      "Receive a preliminary price range based on your information",
      "We assess on-site and confirm the final price before work begins",
    ],
    ctaText: "Get an Estimate",
  },
];

export function getServiceBySlug(slug: string): ServiceType | undefined {
  return services.find((s) => s.slug === slug);
}
