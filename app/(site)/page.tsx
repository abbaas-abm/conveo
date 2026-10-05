import { LatestEventHero } from "@/components/home/LatestEventHero";
import { HomeFeaturedSection } from "@/components/home/HomeFeaturedSection";

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="pwa:hidden">
      <LatestEventHero />
      <HomeFeaturedSection />
    </div>
  );
}
