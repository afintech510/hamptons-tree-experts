export interface Town {
  name: string;
  slug: string;
  township: string;
  townshipSlug: string;
  headline: string;
  intro: string;
  localReferences: LocalReference[];
  commonTrees: string[];
  serviceHighlights: string[];
  /** Hero band image for the town page (path under /public). */
  image: string;
}

export interface LocalReference {
  type: "neighborhood" | "road" | "landmark" | "species" | "job_reference";
  text: string;
}

export const towns: Town[] = [
  {
    name: "Westhampton",
    slug: "westhampton",
    image: "/photos/area-westhampton.webp",
    township: "Southampton",
    townshipSlug: "southampton",
    headline: "Tree & Landscape Services in Westhampton",
    intro:
      "From the historic estates along Dune Road to the wooded lots north of Montauk Highway, Westhampton properties face a unique combination of salt exposure, sandy soil, and mature tree canopy that demands specialized care.",
    localReferences: [
      {
        type: "neighborhood",
        text: "Properties along Dune Road and Beach Lane face constant salt spray that weakens branch structure on mature black cherry and Eastern red cedar, making regular hazard assessment essential.",
      },
      {
        type: "landmark",
        text: "The towering oaks shading Westhampton Beach Main Street are the same species—white oak and red oak—that dominate residential lots throughout the village, and they require the same crown-thinning approach after nor’easters.",
      },
      {
        type: "species",
        text: "Pitch pines along the Quogue-Westhampton border are fire-adapted natives, but their brittle wood makes them the most common storm-damage callout in the 11978 zip code.",
      },
      {
        type: "road",
        text: "We regularly clear overgrown lots along Old Riverhead Road where decades-old locusts and sassafras crowd property lines and drop limbs onto neighboring roofs.",
      },
    ],
    commonTrees: [
      "White Oak",
      "Red Oak",
      "Pitch Pine",
      "Black Cherry",
      "Eastern Red Cedar",
      "Sassafras",
    ],
    serviceHighlights: [
      "Storm damage cleanup after coastal nor’easters",
      "Hazard tree removal near pool houses and detached garages",
      "Mulch beds for salt-exposed foundation plantings",
    ],
  },
  {
    name: "Quogue",
    slug: "quogue",
    image: "/photos/area-quogue.webp",
    township: "Southampton",
    townshipSlug: "southampton",
    headline: "Tree & Landscape Services in Quogue",
    intro:
      "Quogue’s protected village character and proximity to Quogue Wildlife Refuge make tree care here a balance between preservation and property safety. Many properties sit on large, wooded lots where mature trees are both the landscape’s defining feature and its greatest storm risk.",
    localReferences: [
      {
        type: "landmark",
        text: "The 305-acre Quogue Wildlife Refuge shelters the same native hardwood mix—American holly, tupelo, and Atlantic white cedar—that grows on adjacent residential properties, and we follow the same low-impact approach when working near these species on private land.",
      },
      {
        type: "neighborhood",
        text: "Homes on Quogue Street and Jessup Avenue sit under dense canopies of mature post oak and hickory that drop heavy limbs in ice storms, making winter hazard pruning a recurring need.",
      },
      {
        type: "species",
        text: "The American holly trees that line many Quogue driveways are slow-growing broadleaf evergreens—improper pruning destroys their natural form, so we hand-prune rather than hedge-trim these specimens.",
      },
      {
        type: "road",
        text: "Properties along Old Country Road at the Quogue-Westhampton Beach border frequently need stump grinding where old-growth red maple and black gum have been removed for construction clearance.",
      },
    ],
    commonTrees: [
      "Post Oak",
      "Hickory",
      "American Holly",
      "Tupelo",
      "Atlantic White Cedar",
      "Red Maple",
    ],
    serviceHighlights: [
      "Sensitive removal near protected wildlife habitat",
      "Winter hazard pruning for ice-prone hardwoods",
      "Stump grinding on cleared construction lots",
    ],
  },
  {
    name: "Remsenburg",
    slug: "remsenburg",
    image: "/photos/area-remsenburg.webp",
    township: "Southampton",
    townshipSlug: "southampton",
    headline: "Tree & Landscape Services in Remsenburg",
    intro:
      "Remsenburg’s quiet, estate-lined lanes along Moriches Bay create some of the most challenging tree work on the East End. Large waterfront properties with century-old trees require careful, site-specific approaches that boilerplate services can’t deliver.",
    localReferences: [
      {
        type: "neighborhood",
        text: "The bayfront estates along South Country Road and Adelaide Avenue host some of the oldest copper beeches and London plane trees in the township—specimens that require crane-assisted pruning when canopy dieback develops over the water side.",
      },
      {
        type: "landmark",
        text: "The Remsenburg Academy’s grounds, now part of the community center on South Country Road, are framed by mature sugar maples that show the same decline pattern—Asian longhorned beetle damage and drought stress—we see on residential maples throughout the hamlet.",
      },
      {
        type: "species",
        text: "Black walnut trees are unusually common in Remsenburg’s interior lots. Their juglone toxicity kills rhododendrons and azaleas planted within the drip line, so removal often comes as part of a landscape renovation rather than storm damage.",
      },
    ],
    commonTrees: [
      "Copper Beech",
      "London Plane",
      "Sugar Maple",
      "Black Walnut",
      "White Pine",
      "Tulip Poplar",
    ],
    serviceHighlights: [
      "Crane-assisted removal on waterfront properties",
      "Specimen tree preservation for historic estates",
      "Landscape renovation after toxic-species removal",
    ],
  },
  {
    name: "Speonk",
    slug: "speonk",
    image: "/photos/area-speonk.webp",
    township: "Southampton",
    townshipSlug: "southampton",
    headline: "Tree & Landscape Services in Speonk",
    intro:
      "Speonk sits at the transition between the coastal South Fork and the pine barrens interior, giving properties here a distinct mix of maritime hardwoods and inland scrub that requires flexible, site-aware tree care.",
    localReferences: [
      {
        type: "road",
        text: "Properties along Phillips Avenue and North Phillips Avenue back up to the Long Island Rail Road tracks, where decades of unchecked growth has produced a wall of invasive ailanthus (tree of heaven) and wild black cherry that drops fruit and branches onto residential rooflines.",
      },
      {
        type: "species",
        text: "The scrub oak and pitch pine stands east of Speonk along County Road 31 are characteristic pine barrens vegetation—fire-adapted but brittle in ice storms, and our most common Speonk emergency callout after winter weather.",
      },
      {
        type: "neighborhood",
        text: "The older homes on Old Country Road between Speonk and Remsenburg sit on larger lots with mature Norway spruce windbreaks planted in the 1950s–60s. These trees are now 60–70 feet tall and top-heavy, and several have failed catastrophically in recent storms.",
      },
      {
        type: "landmark",
        text: "The Speonk Cemetery on Montauk Highway is bordered by some of the largest Eastern white pines in the hamlet—the same species that dominates nearby residential lots and sheds heavy limbs under snow load.",
      },
    ],
    commonTrees: [
      "Scrub Oak",
      "Pitch Pine",
      "Norway Spruce",
      "Ailanthus",
      "Eastern White Pine",
      "Wild Black Cherry",
    ],
    serviceHighlights: [
      "Invasive species removal (ailanthus, porcelain berry)",
      "Emergency response for ice-storm pine failures",
      "Windbreak assessment and selective thinning",
    ],
  },
  {
    name: "Riverhead",
    slug: "riverhead",
    image: "/photos/area-riverhead.webp",
    township: "Riverhead",
    townshipSlug: "riverhead",
    headline: "Tree & Landscape Services in Riverhead",
    intro:
      "As the commercial and agricultural hub of the East End, Riverhead’s tree care needs range from clearing overgrown farm borders to managing shade trees in the downtown revitalization district and maintaining residential lots in the surrounding hamlets.",
    localReferences: [
      {
        type: "landmark",
        text: "The street trees along Main Street in downtown Riverhead’s revitalization district—mostly honey locusts and red maples—face compacted root zones, road salt damage, and limited soil volume that accelerate decline. We see the same stress patterns on maples in the Roanoke Avenue residential corridor.",
      },
      {
        type: "neighborhood",
        text: "Properties in Northville, between Sound Avenue and the Long Island Sound bluffs, have a distinct tree mix: black locust, Eastern red cedar, and wind-sculpted American beech. Storm cleanup here often involves clearing trees that have slid down the eroding bluff face.",
      },
      {
        type: "species",
        text: "The farmland borders along Sound Avenue are lined with Osage orange hedgerows planted as livestock fencing a century ago. These gnarly, thorn-covered trees are nearly indestructible—but when a property owner wants them gone, it’s a specialized removal job because of the dense, ironwood-like timber.",
      },
      {
        type: "road",
        text: "Residential streets off Roanoke Avenue and Griffing Avenue in downtown Riverhead have aging silver maples with invasive root systems that heave sidewalks and crack foundations—our most common stump-grinding referral in the township.",
      },
    ],
    commonTrees: [
      "Honey Locust",
      "Red Maple",
      "Silver Maple",
      "Black Locust",
      "Osage Orange",
      "American Beech",
    ],
    serviceHighlights: [
      "Commercial lot clearing and farm-border maintenance",
      "Street tree care in the downtown corridor",
      "Foundation-threatening stump and root removal",
    ],
  },
  {
    name: "Manorville",
    slug: "manorville",
    image: "/photos/area-manorville.webp",
    township: "Brookhaven",
    townshipSlug: "brookhaven",
    headline: "Tree & Landscape Services in Manorville",
    intro:
      "Manorville’s large-lot, rural character at the gateway to the Pine Barrens means tree work here is dominated by native pine and oak species on multi-acre properties. The township’s unique jurisdictional situation—straddling Brookhaven and bordering Riverhead—means permit requirements can vary by parcel.",
    localReferences: [
      {
        type: "landmark",
        text: "Properties bordering the Long Island Pine Barrens Preserve along the LIE service roads are subject to fire-management clearing requirements. The pitch pine and scrub oak here are fire-dependent species, and our lot-clearing work follows preserve-adjacent guidelines for defensible space.",
      },
      {
        type: "neighborhood",
        text: "The residential developments along Moriches-Middle Island Road, including the neighborhoods around Eastport-Manor School, have a common pattern: builders left mature oaks and pines between homes in the 1990s–2000s, and those trees are now at the size where root competition and canopy conflicts require selective removal.",
      },
      {
        type: "species",
        text: "Scarlet oak is Manorville’s signature shade tree—its brilliant fall color is the reason builders kept them, but it’s highly susceptible to bacterial leaf scorch, and we remove more scarlet oaks per year in Manorville than any other species on the East End.",
      },
    ],
    commonTrees: [
      "Scarlet Oak",
      "Pitch Pine",
      "Scrub Oak",
      "White Oak",
      "Red Cedar",
      "Black Gum",
    ],
    serviceHighlights: [
      "Pine Barrens-adjacent lot clearing with defensible space",
      "Multi-acre property management",
      "Selective thinning for overgrown residential subdivisions",
    ],
  },
];

export function getTownBySlug(slug: string): Town | undefined {
  return towns.find((t) => t.slug === slug);
}
