import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Contact" };
export const revalidate = 3600;

const DETAILS = [
  {
    icon: MapPin,
    label: "Office Location",
    lines: [
      "Division of Student Affairs (Student Center)",
      "East Campus, University of the Witwatersrand",
      "Braamfontein, Johannesburg",
    ],
  },
  {
    icon: Mail,
    label: "Email",
    lines: ["ask.wits@wits.ac.za"],
    href: "mailto:ask.wits@wits.ac.za",
  },
  {
    icon: Phone,
    label: "Telephone",
    lines: ["+27 (0) 11 717 1888"],
    href: "tel:+27117171888",
  },
  {
    icon: Clock,
    label: "Office Hours",
    lines: ["Monday – Friday", "08:00 – 16:30 SAST"],
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact & Location"
        title="Get in touch with the CSD"
        subtitle="Have a question about our programmes, partnerships or events? Our team is here to help."
      />

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {DETAILS.map((detail) => {
              const Icon = detail.icon;
              const content = (
                <>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      {detail.label}
                    </h3>
                    {detail.lines.map((line) => (
                      <p key={line} className="mt-1 text-sm text-slate-700">
                        {line}
                      </p>
                    ))}
                  </div>
                </>
              );

              return detail.href ? (
                <a key={detail.label} href={detail.href} className="block">
                  <Card className="flex h-full gap-4 border-gray-200 p-5 transition-colors hover:border-gray-300">
                    {content}
                  </Card>
                </a>
              ) : (
                <Card
                  key={detail.label}
                  className="flex h-full gap-4 border-gray-200 p-5"
                >
                  {content}
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden border-gray-200 p-0">
            <div className="relative h-52 w-full bg-slate-100">
              <iframe
                title="CSD office location"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.openstreetmap.org/export/embed.html?bbox=28.028%2C-26.194%2C28.042%2C-26.184&layer=mapnik&marker=-26.189%2C28.035"
              />
            </div>
            <div className="border-t border-gray-200 p-4">
              <p className="text-sm text-slate-600">
                Student Union Building (Matrix), Wits East Campus
              </p>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
