import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = { title: "Contact" };

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
    lines: ["studentaffairs@wits.ac.za"],
    href: "mailto:studentaffairs@wits.ac.za",
  },
  {
    icon: Phone,
    label: "Office Contact",
    lines: ["+27 (0)11 717 9100", "+27 (0)11 717 9234"],
    href: "tel:+27117179100",
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
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
          <div className="space-y-5">
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
                  <Card className="flex gap-4 border-gray-200 p-5 transition-colors hover:border-gray-300">
                    {content}
                  </Card>
                </a>
              ) : (
                <Card
                  key={detail.label}
                  className="flex gap-4 border-gray-200 p-5"
                >
                  {content}
                </Card>
              );
            })}

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

          <div>
            <Card className="border-gray-200 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-gray-900">
                Send us a message
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Complete the form below and the CSD team will respond
                within two business days.
              </p>
              <div className="mt-7">
                <ContactForm />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
