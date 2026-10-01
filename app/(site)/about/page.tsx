import type { Metadata } from "next";
import {
  Award,
  Building2,
  Compass,
  Globe2,
  HandHeart,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "About DLU" };

const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Award,
    title: "Excellence",
    text: "Striving for high standards in personal and professional execution.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    text: "Encouraging creative solutions and entrepreneurial mindsets.",
  },
  {
    icon: Users,
    title: "Collaboration",
    text: "Building spaces to lead with and in relation to others.",
  },
  {
    icon: HandHeart,
    title: "Impact & Activism",
    text: "Driving tangible, positive societal transformation.",
  },
  {
    icon: Globe2,
    title: "Diversity",
    text: "Embracing perspectives across all faculties and backgrounds.",
  },
];

const OBJECTIVES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Compass,
    title: "Purposeful leadership",
    text: "Develop confident, ethical leaders equipped to navigate complexity with empathy and integrity.",
  },
  {
    icon: Sparkles,
    title: "Experiential growth",
    text: "Move learning beyond the classroom through immersive, hands-on leadership experiences.",
  },
  {
    icon: Heart,
    title: "Active citizenship",
    text: "Foster volunteerism, civic duty and social responsibility across the Wits community.",
  },
  {
    icon: Building2,
    title: "Venture creation",
    text: "Support student innovators to transform ideas into sustainable, impactful ventures.",
  },
];

const TEAM = [
  { name: "DLU Programmes Office", role: "Programme design & delivery" },
  { name: "Student Leadership Team", role: "Peer facilitation & community" },
  { name: "Entrepreneurship Hub", role: "Innovation & venture support" },
  { name: "Partnerships & Engagement", role: "Industry & alumni networks" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About the DLU"
        title="Developing Wits students into leaders of consequence"
        subtitle="The Development and Leadership Unit operates within the Division of Student Affairs, providing comprehensive co-curricular development for students across all faculties."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Badge variant="blue">
              <ShieldCheck className="size-3.5" />
              Our mission
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
              Unlocking personal, social and professional growth
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              We provide comprehensive co-curricular development opportunities
              for students across all faculties who aspire to grow personally,
              socially and professionally.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Through a vibrant developmental student experience, we aim to
              incubate a generation of change-makers and innovators equipped to
              shape a better society locally, nationally and globally.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {OBJECTIVES.map((objective) => {
              const Icon = objective.icon;
              return (
                <Card key={objective.title} className="border-gray-200 p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-gray-900">
                    {objective.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {objective.text}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Core values
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              The principles that guide our work across every programme.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="h-full border-gray-200 p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-gray-900">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {value.text}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Student support structures
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Teams dedicated to your development across the university.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <Card key={member.name} className="h-full border-gray-200 p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-base font-medium text-white">
                  {member.name.charAt(0)}
                </div>
                <h3 className="mt-4 font-medium text-gray-900">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{member.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
