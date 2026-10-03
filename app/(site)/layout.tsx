import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PwaChrome } from "@/components/pwa/PwaChrome";
import { TopEventBar } from "@/components/layout/TopEventBar";
import { getCachedLatestEvent } from "@/lib/data";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const latestEvent = await getCachedLatestEvent();

  return (
    <div className="flex min-h-full flex-col">
      <TopEventBar
        event={
          latestEvent
            ? {
                id: latestEvent.id,
                title: latestEvent.title,
                startDate: latestEvent.start_date,
              }
            : null
        }
      />
      <Navbar />
      <PwaChrome />
      <main className="flex flex-1 flex-col pwa:pt-14 pwa:pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
