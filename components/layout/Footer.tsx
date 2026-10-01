import Link from "next/link";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src="/wits-logo-white.png"
              alt="University of the Witwatersrand"
              width={150}
              height={42}
              className="h-9 w-auto"
            />
            <span className="text-sm font-semibold text-primary">DLU</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-600">
            The Development and Leadership Unit (DLU) operates within the
            Division of Student Affairs at Wits University, unlocking personal,
            social and professional growth for students across all faculties.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-gray-600 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <span>
                First Floor, Student Union Building (Matrix), East Campus, 1
                Jan Smuts Avenue, Braamfontein
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-gray-400" />
              <a
                href="mailto:Programmes.DLU@wits.ac.za"
                className="hover:text-primary"
              >
                Programmes.DLU@wits.ac.za
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-gray-400" />
              <span>+27 (0)11 717 9234</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-gray-400" />
              <span>Mon – Fri, 08:00 – 16:30 SAST</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Development &amp; Leadership Unit,
            University of the Witwatersrand.
          </p>
          <p>Empowering Wits change makers &amp; future leaders.</p>
        </div>
      </div>
    </footer>
  );
}
