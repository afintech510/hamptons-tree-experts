import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { PhotoBand } from "@/components/PhotoBand";
import { ServiceSchema } from "@/components/SchemaOrg";

export const metadata: Metadata = {
  title: "Emergency & Storm Response | 24/7 Tree Service",
  description:
    "Emergency tree removal and storm damage cleanup for Long Island's East End. Rapid response for downed trees, hazard limbs, and storm debris in Westhampton, Quogue, Remsenburg, Speonk, Riverhead, and Manorville.",
  openGraph: {
    title: "Emergency & Storm Response | Hamptons Tree Experts",
    description:
      "Rapid response for downed trees, hazard limbs, and storm debris across the East End.",
    url: "https://hamptonstreeexperts.com/emergency",
  },
};

export default function EmergencyPage() {
  return (
    <>
      <ServiceSchema
        name="Emergency & Storm Response Tree Service"
        description="Rapid-response tree removal and storm damage cleanup for downed trees, hazard limbs, and debris across Long Island's East End."
        url="https://hamptonstreeexperts.com/emergency"
      />

      {/* Hero — intentionally high-urgency visual tone */}
      <section className="bg-evergreen-dark px-6 py-20 text-white">
        <div className="mx-auto max-w-[800px]">
          <div className="inline-block rounded bg-warning/20 px-3 py-1 text-sm font-semibold text-warning">
            Emergency Service
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Storm Damage &amp; Emergency Tree Response
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-sand-light">
            When a tree comes down on your property, your roof, or your
            driveway, you need a crew that knows the East End and can be on-site
            fast. We handle emergency tree removal, hazard limb clearance, and
            storm debris cleanup across Westhampton, Quogue, Remsenburg, Speonk,
            Riverhead, and Manorville.
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Request Emergency Service
          </Button>
        </div>
      </section>

      {/* Storm damage hero image band */}
      <PhotoBand
        src="/photos/emergency-hero.webp"
        alt="A storm-felled tree resting on an outbuilding roof on the East End"
        position="center 40%"
        height="h-72 sm:h-96 lg:h-[30rem]"
        caption="Tree down on a structure? We triage the hazards first."
      />

      {/* What We Handle */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-display text-3xl font-bold">What We Handle</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {emergencyServices.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-warm-gray-200 bg-white p-6"
              >
                <h3 className="font-display text-lg font-bold text-evergreen-dark">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-warm-gray-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* East End Storm Context */}
      <section className="bg-sand-light px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="font-display text-3xl font-bold">
            Why the East End Needs Specialized Storm Response
          </h2>
          <div className="mt-8 space-y-6 text-warm-gray-600 leading-relaxed">
            <p>
              The East End catches storms from three directions: nor&apos;easters
              driving in off the Atlantic, tropical remnants tracking up the
              coast, and winter ice storms that load the canopy of every pitch
              pine and oak from Manorville to Montauk. The sandy, shallow soils
              along the South Fork give tree roots less purchase than inland clay,
              so wind speeds that wouldn&apos;t topple a tree in Ronkonkoma
              regularly bring down 60-foot oaks in Westhampton.
            </p>
            <p>
              After Hurricane Sandy and the string of coastal storms since, East
              End homeowners know that the first 24 hours after a storm determine
              whether a downed tree becomes an insurance headache or a
              quickly-resolved cleanup. Our single-crew model means we don&apos;t
              dispatch subcontractors—the same people assessing the hazard are
              the ones cutting and clearing.
            </p>
            <p>
              We prioritize by hazard level: trees on structures and blocking
              egress go first, hazard limbs threatening power lines or pedestrian
              areas go second, and cosmetic damage and debris go third. This
              triage approach lets us serve the most urgent needs in the
              community first while still reaching every customer promptly.
            </p>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="font-display text-3xl font-bold">
            Emergency Response Process
          </h2>
          <ol className="mt-8 space-y-8">
            {emergencyProcess.map((step, i) => (
              <li key={step.title} className="flex items-start gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-evergreen font-mono text-lg font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-warm-gray-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-evergreen px-6 py-16 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="font-display text-3xl font-bold text-white">
            Tree Down? Contact Us Now.
          </h2>
          <p className="mt-4 text-sand-light">
            Describe the situation and we&apos;ll assess the urgency and get back
            to you as fast as possible.
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Request Emergency Service
          </Button>
        </div>
      </section>
    </>
  );
}

const emergencyServices = [
  {
    title: "Downed Tree Removal",
    description:
      "Full removal of trees that have fallen on structures, vehicles, driveways, or across property lines. Includes limbing, bucking, and debris haul-away.",
  },
  {
    title: "Hazard Limb Clearance",
    description:
      "Removal of storm-damaged limbs that are hanging, split, or leaning against structures and power lines. We work around live utilities with proper clearance protocols.",
  },
  {
    title: "Storm Debris Cleanup",
    description:
      "Comprehensive clearing of branches, brush, and fallen material after a storm event. We haul everything—no pile left on the curb.",
  },
  {
    title: "Root Ball Extraction",
    description:
      "When a tree uproots entirely, the root ball leaves a crater that's a hazard and an eyesore. We extract, fill, and grade the area back to usable condition.",
  },
  {
    title: "Access Restoration",
    description:
      "Clearing driveways, walkways, and property access blocked by fallen trees or debris so you can get in and out safely.",
  },
  {
    title: "Structural Assessment Support",
    description:
      "We document the damage for your insurance claim and coordinate with adjusters to ensure the tree-related scope is accurately captured.",
  },
];

const emergencyProcess = [
  {
    title: "Contact Us",
    description:
      "Reach out through the form or by phone. Describe the situation: what fell, where it landed, and whether anyone is in danger or access is blocked.",
  },
  {
    title: "Triage & Priority Assessment",
    description:
      "We assess the urgency and schedule accordingly. Structural hazards and blocked access go first; cosmetic damage is queued behind critical work.",
  },
  {
    title: "On-Site Assessment",
    description:
      "Our crew evaluates the full scope on arrival—sometimes what looks like one downed tree reveals additional hazard limbs that need immediate attention.",
  },
  {
    title: "Safe Removal & Cleanup",
    description:
      "We remove the hazard, clear all debris, and leave the site clean. For insurance-documented jobs, we photograph before, during, and after.",
  },
];
