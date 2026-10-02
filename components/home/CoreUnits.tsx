import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

interface Unit {
  acronym: string;
  name: string;
  image: string;
  focus: string;
  offerings: string[];
}

const UNITS: Unit[] = [
  {
    acronym: "DLU",
    name: "Development & Leadership Unit",
    image: "/dlu.jpg",
    focus:
      "Student leadership cultivation, experiential learning and student entrepreneurship.",
    offerings: [
      "Leadership workshops",
      "E-Hub innovation pitch sessions",
      "Critical engagement forums",
      "Campus brand activations",
    ],
  },
  {
    acronym: "WCCO",
    name: "Wits Citizenship & Community Outreach",
    image: "/wcco.jpg",
    focus:
      "Community development, civic engagement, social justice and volunteerism.",
    offerings: [
      "Volunteer outreach programmes",
      "Food security & Food Bank",
      "Community development drives",
      "Civic responsibility campaigns",
    ],
  },
  {
    acronym: "SGO",
    name: "Student Governance Office",
    image: "/student-governace-office.jpg",
    focus:
      "Democratic processes, student representation and leadership support.",
    offerings: [
      "SRC elections management",
      "House Committee training",
      "Governance capacity-building",
      "Leadership accountability workshops",
    ],
  },
  {
    acronym: "STPU",
    name: "Student Transitions & Persistence Unit",
    image: "/student-transitions.jpg",
    focus:
      "Onboarding, academic-adjacent support, first-year integration and persistence.",
    offerings: [
      "First-year orientation support",
      "Transition workshops",
      "Student success tracking",
      "Drop-out prevention initiatives",
    ],
  },
];

export function CoreUnits() {
  return (
    <section id="core-units" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Core Units &amp; Programmes
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-gray-900 sm:text-3xl">
            Four units, one integrated student experience
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            The CSD brings together four constituent units, each with a distinct
            focus that shapes well-rounded graduates equipped to drive
            meaningful change.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {UNITS.map((unit) => (
            <Card
              key={unit.acronym}
              className="group flex h-full flex-col overflow-hidden border-gray-200"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <Image
                  src={unit.image}
                  alt={unit.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute left-3 top-3 rounded-md bg-[#d9b45b] px-2 py-0.5 text-xs font-bold text-primary">
                  {unit.acronym}
                </span>
                <h3 className="absolute inset-x-4 bottom-3 font-semibold leading-snug text-white drop-shadow">
                  {unit.name}
                </h3>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-relaxed text-gray-600">
                  {unit.focus}
                </p>
                <ul className="mt-4 space-y-2">
                  {unit.offerings.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#d9b45b]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Learn more about the CSD
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
