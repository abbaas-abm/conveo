import type { Metadata } from "next";
import {
  Building2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoreUnits } from "@/components/home/CoreUnits";

export const metadata: Metadata = { title: "About CSD" };

const CONSTITUENT_UNITS = [
  {
    name: "Development & Leadership Unit (DLU)",
    focus: "Leadership, experiential learning & entrepreneurship.",
  },
  {
    name: "Wits Citizenship & Community Outreach (WCCO)",
    focus: "Civic engagement, social justice & volunteerism.",
  },
  {
    name: "Student Governance Office (SGO)",
    focus: "Democratic processes, representation & accountability.",
  },
  {
    name: "Student Transitions & Persistence Unit (STPU)",
    focus: "Onboarding, first-year integration & persistence.",
  },
];

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Sparkles,
    title: "Holistic Development",
    text: "Balancing academic success with social, leadership and emotional growth.",
  },
  {
    icon: HeartHandshake,
    title: "Active Citizenship & Service",
    text: "Encouraging community engagement, volunteerism and advocacy.",
  },
  {
    icon: ShieldCheck,
    title: "Effective Governance",
    text: "Supporting student leadership bodies and democratic participation.",
  },
  {
    icon: Users,
    title: "Persistence & Resilience",
    text: "Providing transition frameworks that help students navigate university life successfully.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About the CSD"
        title="A dynamic, innovative centre for student development"
        subtitle="The Centre for Student Development is a unit within the Division of Student Affairs at Wits University, integrating and enhancing student development and support services."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Badge variant="blue">
              <Building2 className="size-3.5" />
              Our mission
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
              Shaping well-rounded graduates
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              Established to integrate and enhance student development and
              support services, the CSD brings together four key constituent
              units. By providing holistic, inclusive and empowering
              co-curricular experiences, the CSD plays a vital role in shaping
              well-rounded graduates equipped to drive meaningful societal
              transformation across all sectors.
            </p>
          </div>

          <div className="space-y-3">
            {CONSTITUENT_UNITS.map((unit) => (
              <Card
                key={unit.name}
                className="flex items-start gap-4 border-gray-200 p-5"
              >
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">{unit.name}</h3>
                  <p className="mt-0.5 text-sm text-gray-600">{unit.focus}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Core strategic pillars
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              The principles that guide student development across every CSD
              unit.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card key={pillar.title} className="h-full border-gray-200 p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-gray-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {pillar.text}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <CoreUnits />
    </>
  );
}
