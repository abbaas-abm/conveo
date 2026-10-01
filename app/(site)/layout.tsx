import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getCurrentUser();

  return (
    <div className="flex min-h-full flex-col">
      <Navbar profile={profile} />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
