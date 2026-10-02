import type { Metadata, Viewport } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CSD | Centre for Student Development — Wits University",
    template: "%s | CSD Wits",
  },
  description:
    "The Centre for Student Development integrates leadership, civic engagement, governance and persistence support to create empowered, well-rounded Wits graduates.",
  applicationName: "Wits CSD",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wits CSD",
  },
};

export const viewport: Viewport = {
  themeColor: "#003366",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white">
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        <Toaster />
        <InstallAppButton />
      </body>
    </html>
  );
}
