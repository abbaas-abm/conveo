import {
  BookOpenCheck,
  Compass,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Users,
    title: "Student Leadership",
    description:
      "Workshops, seminars and customised programmes that build communication, ethics and emotional intelligence.",
  },
  {
    icon: Compass,
    title: "Governance & Critical Engagement",
    description:
      "Roundtables, panel debates and experiential learning that develop informed, ethical student leaders.",
  },
  {
    icon: BookOpenCheck,
    title: "Workshops & Enterprise",
    description:
      "Entrepreneurship, innovation and campus activations that turn student ideas into real-world impact.",
  },
];

export function Pillars() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
            Our core focus areas
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            Four connected streams that shape confident, ethical and
            enterprising leaders ready to serve society.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="border-gray-200 p-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {pillar.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
