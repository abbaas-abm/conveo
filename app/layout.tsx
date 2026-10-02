import type { Metadata } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      </body>
    </html>
  );
}
