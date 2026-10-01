import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-600">
        The page or event you are looking for may have been moved, closed or no
        longer exists.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/events">Browse events</Link>
        </Button>
      </div>
    </div>
  );
}
